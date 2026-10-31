package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.MemberProfileUpdate;
import com.adaptlearngraph.identity.infrastructure.JdbcMemberReferenceValidator;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcSubscriptionWorkspaceStore implements SubscriptionWorkspaceStore {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final boolean developmentFixtures;

    public JdbcSubscriptionWorkspaceStore(JdbcTemplate jdbc, TransactionTemplate transactions) {
        this(jdbc,transactions,false);
    }
    public JdbcSubscriptionWorkspaceStore(JdbcTemplate jdbc, TransactionTemplate transactions,boolean developmentFixtures) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.developmentFixtures=developmentFixtures;
    }

    @Override
    public void require(Actor actor, UUID organizationId, Action action, Instant now) {
        var actual = currentActor(actor);
        if (action == Action.SUSPENSION || action == Action.PLAN_CONFIGURATION) {
            if (!SubscriptionAccessPolicy.permits(actual, action, organizationId, false, false, false)) throw forbidden();
            return;
        }
        var states = jdbc.query("""
                SELECT o.status, w.setup_state,
                  EXISTS(SELECT 1 FROM platform.subscription s JOIN platform.subscription_period p USING(subscription_id)
                    WHERE s.organization_id=o.organization_id AND p.starts_at<=? AND p.ends_at>?) AS paid
                FROM platform.organization o LEFT JOIN platform.organization_workspace w USING(organization_id)
                WHERE o.organization_id=?
                """, (rs, i) -> new State("READY".equals(rs.getString(2)), "SUSPENDED".equals(rs.getString(1)), rs.getBoolean(3)),
                time(now), time(now), organizationId);
        if (states.isEmpty()) throw forbidden();
        var state = states.getFirst();
        // Explicit development grant, never a fabricated paid order/period or a billing privilege.
        boolean developmentGrant=developmentFixtures && action==Action.WORKSPACE
                && com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace.ORGANIZATION.equals(organizationId)
                && Set.of("employee","employee-se","expert","ld").stream().map(com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace::id)
                    .anyMatch(actual.accountId()::equals);
        if (!SubscriptionAccessPolicy.permits(actual, action, organizationId, state.ready(), state.suspended(), state.paid() || developmentGrant)) throw forbidden();
    }

    private Actor currentActor(Actor actor) {
        if (actor == null) throw forbidden();
        var rows = jdbc.query("""
                SELECT a.active,a.organization_id,coalesce(m.active,false),m.membership_id FROM platform.account a
                  LEFT JOIN platform.organization_membership m USING(account_id) WHERE a.account_id=?
                """, (rs, i) -> new Account(rs.getBoolean(1), rs.getObject(2,UUID.class),rs.getBoolean(3),rs.getObject(4,UUID.class)),
                actor.accountId());
        if (rows.isEmpty()) throw forbidden();
        var account = rows.getFirst();
        Set<Role> roles = new HashSet<>();
        if (account.member() != null) roles.addAll(jdbc.query(
                "SELECT role_code FROM platform.organization_membership_role WHERE membership_id=?",
                (rs,i) -> Role.valueOf(rs.getString(1)), account.member()));
        if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.platform_administrator WHERE account_id=?)",
                Boolean.class, actor.accountId()))) roles.add(Role.PLATFORM_ADMINISTRATOR);
        return new Actor(actor.accountId(), account.organization(), account.active(), account.membershipActive(), roles,
                actor.mfaVerified(), actor.mfaRequired());
    }

    @Override
    public Summary summary(UUID organizationId, Instant now) {
        var periods = jdbc.query("""
                SELECT p.period_id,p.starts_at,p.ends_at,o.name,o.description,o.price_vnd,o.currency,o.duration_months,o.employee_seats
                FROM platform.subscription s JOIN platform.subscription_period p USING(subscription_id)
                JOIN platform.payment_order o USING(order_id) WHERE s.organization_id=? AND p.ends_at>?
                ORDER BY p.starts_at
                """, (rs,i) -> new PaidPeriod(rs.getObject(1,UUID.class),rs.getTimestamp(2).toInstant(),rs.getTimestamp(3).toInstant(),
                new PlanTerms(rs.getString(4),rs.getString(5),rs.getLong(6),rs.getString(7),rs.getInt(8),rs.getInt(9))),
                organizationId,time(now));
        PaidPeriod current = periods.stream().filter(p -> !p.startsAt().isAfter(now)).findFirst().orElse(null);
        PaidPeriod next = periods.stream().filter(p -> p.startsAt().isAfter(now)).findFirst().orElse(null);
        int allocated = current == null ? 0 : current.terms().employeeSeats();
        Integer pending = jdbc.queryForObject("""
                SELECT min(o.employee_seats) FROM platform.payment_order o JOIN platform.subscription_intent i USING(intent_id)
                WHERE i.organization_id=? AND i.state IN ('OPEN','WAITING_CAPACITY','EXCEPTION')
                AND o.payment_status IN ('CREATING','PENDING','UNKNOWN','PARTIAL','PAID','EXCEPTION')
                """, Integer.class, organizationId);
        int limit = SubscriptionAccessPolicy.admissionLimit(allocated,pending,next == null ? null : next.terms().employeeSeats());
        int used = used(organizationId);
        var history = jdbc.query("""
                SELECT o.*,i.kind,i.registration_id,i.organization_id,i.owner_account_id
                FROM platform.payment_order o JOIN platform.subscription_intent i USING(intent_id)
                LEFT JOIN platform.organization_workspace w ON w.registration_id=i.registration_id
                WHERE i.organization_id=? OR w.organization_id=? ORDER BY o.created_at DESC,o.attempt DESC
                """, JdbcPaymentOrderStore::map,organizationId,organizationId);
        String status = jdbc.queryForObject("SELECT status FROM platform.organization WHERE organization_id=?",String.class,organizationId);
        String name=jdbc.queryForObject("SELECT name FROM platform.organization WHERE organization_id=?",String.class,organizationId);
        return new Summary(organizationId,name,status,current == null ? "EXPIRED" : "ACTIVE",current,next,used,allocated,limit,history);
    }

    @Override
    public Setup setup(UUID registrationId) {
        return jdbc.query("SELECT organization_id,setup_state,ready_at,failure_code FROM platform.organization_workspace WHERE registration_id=?",
                (rs,i) -> new Setup(rs.getObject(1,UUID.class),rs.getString(2),
                        rs.getTimestamp(3)==null?null:rs.getTimestamp(3).toInstant(),rs.getString(4)),registrationId)
                .stream().findFirst().orElse(new Setup(null,"NOT_STARTED",null,null));
    }

    @Override
    public List<Workspace> workspaces() {
        return jdbc.query("""
                SELECT o.organization_id,o.name,o.status,w.setup_state FROM platform.organization o
                JOIN platform.organization_workspace w USING(organization_id) ORDER BY o.created_at DESC
                """,(rs,i) -> new Workspace(rs.getObject(1,UUID.class),rs.getString(2),rs.getString(3),rs.getString(4)));
    }

    @Override
    public void suspend(Actor actor, UUID organizationId, boolean suspended, Instant now) {
        transactions.executeWithoutResult(tx -> {
            lock(organizationId);
            require(actor,organizationId,Action.SUSPENSION,now);
            jdbc.update("UPDATE platform.organization SET status=? WHERE organization_id=?",suspended?"SUSPENDED":"ACTIVE",organizationId);
            audit(actor.accountId(),suspended?"WORKSPACE_SUSPENDED":"WORKSPACE_REACTIVATED",organizationId,now);
        });
    }

    @Override
    public List<Member> members(UUID organizationId) {
        return jdbc.query("""
                SELECT m.*,a.identifier,a.active AS account_active,coalesce(p.full_name,r.admin_name) AS full_name,
                  d.name AS department_name,o.name AS occupation_name
                FROM platform.organization_membership m JOIN platform.account a USING(account_id)
                LEFT JOIN platform.organization_registration r USING(account_id)
                LEFT JOIN platform.workspace_account_profile p USING(account_id)
                LEFT JOIN platform.department_reference d ON d.department_id=m.department_id AND d.organization_id=m.organization_id
                LEFT JOIN platform.occupation_department_reference o ON o.occupation_reference_id=m.occupation_reference_id
                  AND o.organization_id=m.organization_id AND o.department_id=m.department_id
                WHERE m.organization_id=? ORDER BY a.identifier
                """,(rs,i) -> {
                    UUID id=rs.getObject("membership_id",UUID.class);
                    Set<String> roles=new HashSet<>(jdbc.query("SELECT role_code FROM platform.organization_membership_role WHERE membership_id=?",
                            (role,index)->role.getString(1),id));
                    return new Member(id,rs.getObject("account_id",UUID.class),rs.getString("full_name"),rs.getString("identifier"),
                            rs.getBoolean("active"),roles,rs.getObject("department_id",UUID.class),
                            rs.getObject("occupation_reference_id",UUID.class),rs.getLong("revision"),
                            rs.getString("department_name"),rs.getString("occupation_name"),rs.getBoolean("account_active"));
                },organizationId);
    }

    @Override
    public Member updateMember(Actor actor, UUID organizationId, UUID memberId, MemberProfileUpdate update, Instant now) {
        return transactions.execute(tx -> {
            lock(organizationId);
            require(actor,organizationId,Action.BILLING_READ,now);
            require(actor,organizationId,Action.WORKSPACE,now);
            Member member=members(organizationId).stream().filter(value->value.membershipId().equals(memberId))
                    .findFirst().orElseThrow(JdbcSubscriptionWorkspaceStore::forbidden);
            if(member.revision()!=update.revision()) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,
                    "Membership changed. Refresh and retry.");
            boolean historical=java.util.Objects.equals(member.departmentId(),update.departmentId())
                    && java.util.Objects.equals(member.occupationReferenceId(),update.occupationReferenceId())
                    && (!update.roles().contains("EMPLOYEE") || member.roles().contains("EMPLOYEE"));
            JdbcMemberReferenceValidator.validate(jdbc,organizationId,update.roles(),update.departmentId(),update.occupationReferenceId(),historical);
            jdbc.update("UPDATE platform.organization_membership SET department_id=?,occupation_reference_id=? WHERE membership_id=?",
                    update.departmentId(),update.occupationReferenceId(),memberId);
            // Reuse the serialized role, last-administrator, revision and capacity checks in the same transaction.
            changeMember(actor,organizationId,memberId,member.active(),update.roles(),update.revision(),now);
            int changed=jdbc.update("""
                    INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at,auth_version,recovery_required)
                    SELECT a.account_id,?,coalesce(p.email_verified_at,r.email_verified_at),
                      coalesce(p.auth_version,r.auth_version,0),coalesce(p.recovery_required,r.recovery_required,false)
                    FROM platform.account a LEFT JOIN platform.workspace_account_profile p USING(account_id)
                    LEFT JOIN platform.organization_registration r USING(account_id)
                    WHERE a.account_id=? AND coalesce(p.email_verified_at,r.email_verified_at) IS NOT NULL
                    ON CONFLICT(account_id) DO UPDATE SET full_name=excluded.full_name
                    """,update.fullName(),member.accountId());
            if(changed!=1) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,
                    "The account does not have a verified workspace profile.");
            audit(actor.accountId(),"MEMBER_PROFILE_UPDATED",memberId,now);
            return members(organizationId).stream().filter(value->value.membershipId().equals(memberId)).findFirst().orElseThrow();
        });
    }

    @Override
    public void changeMember(Actor actor, UUID organizationId, UUID memberId, boolean active, Set<String> roles, long revision, Instant now) {
        if (roles == null || roles.size() != 1 || roles.stream().anyMatch(java.util.Objects::isNull)
                || !Set.of("EMPLOYEE","LD_MANAGER","DOMAIN_EXPERT","ORGANIZATION_ADMINISTRATOR").containsAll(roles)) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,"Select exactly one organization role.","roles");
        }
        transactions.executeWithoutResult(tx -> {
            lock(organizationId);
            require(actor,organizationId,Action.BILLING_READ,now);
            var member=members(organizationId).stream().filter(m->m.membershipId().equals(memberId)).findFirst()
                    .orElseThrow(JdbcSubscriptionWorkspaceStore::forbidden);
            if (member.revision()!=revision) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,"Membership changed. Refresh and retry.");
            boolean reducing = (!active && member.active() && roles.equals(member.roles()))
                    || (active==member.active() && member.roles().containsAll(roles) && !roles.equals(member.roles()));
            require(actor,organizationId,reducing?Action.SEAT_REDUCTION:Action.WORKSPACE,now);
            if (member.active() && member.roles().contains("ORGANIZATION_ADMINISTRATOR")
                    && (!active || !roles.contains("ORGANIZATION_ADMINISTRATOR"))) {
                int admins=jdbc.queryForObject("""
                        SELECT count(*) FROM platform.organization_membership m JOIN platform.account a USING(account_id)
                        JOIN platform.organization_membership_role r USING(membership_id)
                        WHERE m.organization_id=? AND m.active AND a.active AND r.role_code='ORGANIZATION_ADMINISTRATOR'
                        """,Integer.class,organizationId);
                if(admins<=1) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,"The last active System Administrator cannot be removed.");
            }
            if(roles.contains("EMPLOYEE") && (member.departmentId()==null || member.occupationReferenceId()==null)) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED,"Employee department and occupation are required.");
            }
            boolean accountActive=Boolean.TRUE.equals(jdbc.queryForObject("SELECT active FROM platform.account WHERE account_id=?",Boolean.class,member.accountId()));
            boolean wasSeat=accountActive && member.active() && member.roles().contains("EMPLOYEE");
            boolean newSeat=accountActive && active && roles.contains("EMPLOYEE");
            if(newSeat && !wasSeat && used(organizationId)>=summary(organizationId,now).admissionLimit()) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED,"No Employee seat is available.");
            }
            jdbc.update("UPDATE platform.organization_membership SET active=?,revision=revision+1,updated_at=? WHERE membership_id=?",
                    active,time(now),memberId);
            jdbc.update("DELETE FROM platform.organization_membership_role WHERE membership_id=?",memberId);
            for(String role:roles) jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,?)",memberId,role);
            if(roles.contains("EMPLOYEE")) jdbc.update(
                    "INSERT INTO platform.learner_state(learner_id) VALUES (?) ON CONFLICT(learner_id) DO NOTHING",member.accountId());
            audit(actor.accountId(),"MEMBERSHIP_CHANGED",memberId,now);
        });
    }

    private int used(UUID organization) {
        return jdbc.queryForObject("""
                SELECT count(*) FROM platform.organization_membership m JOIN platform.account a USING(account_id)
                JOIN platform.organization_membership_role r USING(membership_id)
                WHERE m.organization_id=? AND m.active AND a.active AND r.role_code='EMPLOYEE'
                """,Integer.class,organization);
    }
    private void lock(UUID organization) {
        if(jdbc.query("SELECT organization_id FROM platform.organization WHERE organization_id=? FOR UPDATE",
                (rs,i)->rs.getObject(1),organization).isEmpty()) throw forbidden();
    }
    private void audit(UUID actor,String action,UUID resource,Instant now) {
        jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id,actor_id,action,resource_id,occurred_at,outcome,correlation_id)
                VALUES (?,?,?,?,?,'SUCCEEDED',?)
                """,UUID.randomUUID(),actor,action,resource,time(now),UUID.randomUUID());
    }
    private static Timestamp time(Instant instant) { return Timestamp.from(instant); }
    private static SubscriptionFailure forbidden() { return new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN,"Workspace access is not permitted for this account and entitlement."); }
    private record State(boolean ready,boolean suspended,boolean paid) {}
    private record Account(boolean active,UUID organization,boolean membershipActive,UUID member) {}
}
