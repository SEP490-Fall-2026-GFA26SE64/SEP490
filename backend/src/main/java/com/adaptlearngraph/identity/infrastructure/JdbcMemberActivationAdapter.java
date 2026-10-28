package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.AuthenticationAttemptGuard;
import com.adaptlearngraph.identity.application.port.in.MemberActivationUseCase;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcMemberActivationAdapter implements MemberActivationUseCase {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final SubscriptionIdentity identity;
    private final SubscriptionWorkspaceStore workspaces;
    private final RegistrationSecrets secrets;
    private final RegistrationStore security;
    private final RegistrationMailDelivery mail;
    private final Clock clock;
    public JdbcMemberActivationAdapter(JdbcTemplate jdbc,TransactionTemplate transactions,SubscriptionIdentity identity,
            SubscriptionWorkspaceStore workspaces,RegistrationSecrets secrets,RegistrationStore security,RegistrationMailDelivery mail,Clock clock) {
        this.jdbc=jdbc; this.transactions=transactions; this.identity=identity; this.workspaces=workspaces;
        this.secrets=secrets; this.security=security; this.mail=mail; this.clock=clock;
    }
    @Override
    public Invitation invite(UUID organization,Input input) {
        var actor=identity.current().actor();
        String email=RegistrationFields.normalizeEmail(input.email());
        if(input.fullName()==null || input.fullName().isBlank() || input.fullName().length()>120
                || email.length()>254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || input.roles()==null || input.roles().size()!=1
                || input.roles().stream().anyMatch(java.util.Objects::isNull)
                || !Set.of("EMPLOYEE","LD_MANAGER","DOMAIN_EXPERT","ORGANIZATION_ADMINISTRATOR").containsAll(input.roles())) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,"Supply a name, valid email and exactly one organization role.");
        }
        mail.requireConfigured(); secrets.requireConfigured();
        return transactions.execute(tx->{
            lock(organization);
            workspaces.require(actor,organization,Action.BILLING_READ,clock.instant());
            workspaces.require(actor,organization,Action.WORKSPACE,clock.instant());
            validateReferences(organization,input.roles(),input.departmentId(),input.occupationReferenceId());
            security.lockEmail(email);
            if(security.accountExists(email)) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,"An account already exists for this email.");
            var existing=jdbc.query("SELECT activation_id,organization_id,last_sent_at FROM platform.workspace_activation WHERE email=? AND consumed_at IS NULL FOR UPDATE",
                    (rs,i)->new Pending(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),rs.getTimestamp(3).toInstant()),email);
            Instant now=clock.instant();
            if(!existing.isEmpty() && (!organization.equals(existing.getFirst().organization()) || now.isBefore(existing.getFirst().sent().plusSeconds(60)))) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,"An activation is pending. Wait before resending.");
            }
            String bucketKey=secrets.digest("activation-send:"+organization+":"+email);
            var bucket=security.lockRate(bucketKey,now);
            boolean same=now.isBefore(bucket.windowStartedAt().plusSeconds(3600));
            if(same && bucket.attempts()>=5) throw new RegistrationFailure(RegistrationFailure.Code.RATE_LIMITED,"Wait before sending another activation.",null,3600);
            security.saveRate(bucketKey,new RegistrationStore.RateBucket(same?bucket.windowStartedAt():now,same?bucket.attempts()+1:1,null));
            UUID id=existing.isEmpty()?UUID.randomUUID():existing.getFirst().id();
            String token=secrets.recoveryCode()+secrets.recoveryCode();
            String proof=secrets.digest("activation:"+token);
            var roles=input.roles().stream().sorted().toArray(String[]::new);
            long generation;
            if(existing.isEmpty()) {
                jdbc.update(connection->{
                    var sql=connection.prepareStatement("""
                        INSERT INTO platform.workspace_activation(activation_id,organization_id,created_by,full_name,email,roles,
                          department_id,occupation_reference_id,proof_hash,generation,expires_at,created_at,last_sent_at)
                        VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?)
                        """);
                    sql.setObject(1,id); sql.setObject(2,organization); sql.setObject(3,actor.accountId());
                    sql.setString(4,input.fullName().strip()); sql.setString(5,email); sql.setArray(6,connection.createArrayOf("text",roles));
                    sql.setObject(7,input.departmentId()); sql.setObject(8,input.occupationReferenceId()); sql.setString(9,proof);
                    sql.setTimestamp(10,time(now.plusSeconds(600)));sql.setTimestamp(11,time(now));sql.setTimestamp(12,time(now));
                    return sql;
                });
                generation=1;
            } else {
                // A resend replaces the proof, not the previously authorized membership terms.
                jdbc.update("UPDATE platform.workspace_activation SET proof_hash=?,generation=generation+1,expires_at=?,last_sent_at=? WHERE activation_id=?",
                        proof,time(now.plusSeconds(600)),time(now),id);
                generation=jdbc.queryForObject("SELECT generation FROM platform.workspace_activation WHERE activation_id=?",Long.class,id);
            }
            UUID event=UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO platform.outbox_event(event_id,event_type,aggregate_id,source_revision,payload,correlation_id,created_at)
                    VALUES (?,'MEMBER_ACTIVATION',?,?,jsonb_build_object('encryptedToken',?::text),?,?)
                    """,event,id,generation,secrets.encrypt(token,"activation:"+id+":"+generation),UUID.randomUUID(),time(now));
            jdbc.update("INSERT INTO platform.processing_job(job_id,event_id,handler,next_retry_at,created_at) VALUES (?,?,'MEMBER_ACTIVATION_EMAIL',?,?)",
                    UUID.randomUUID(),event,time(now),time(now));
            security.audit(actor.accountId(),"MEMBER_ACTIVATION_REQUESTED","SUCCEEDED",now);
            return new Invitation(id,email,now.plusSeconds(600),"PENDING");
        });
    }
    @Override
    public List<PendingActivation> pending(UUID organization) {
        workspaces.require(identity.current().actor(),organization,Action.MEMBER_READ,clock.instant());
        return jdbc.query("""
                SELECT a.*,d.name AS department_name,o.name AS occupation_name,j.status AS job_status
                FROM platform.workspace_activation a
                LEFT JOIN platform.department_reference d ON d.department_id=a.department_id AND d.organization_id=a.organization_id
                LEFT JOIN platform.occupation_department_reference o ON o.occupation_reference_id=a.occupation_reference_id
                  AND o.department_id=a.department_id AND o.organization_id=a.organization_id
                LEFT JOIN platform.outbox_event e ON e.aggregate_id=a.activation_id AND e.event_type='MEMBER_ACTIVATION' AND e.source_revision=a.generation
                LEFT JOIN platform.processing_job j ON j.event_id=e.event_id AND j.handler='MEMBER_ACTIVATION_EMAIL'
                WHERE a.organization_id=? AND a.consumed_at IS NULL ORDER BY a.created_at DESC
                """,(rs,i)->{
                    Instant expires=rs.getTimestamp("expires_at").toInstant();
                    String job=rs.getString("job_status");
                    String delivery=job==null?"NOT_REQUESTED":"SUCCEEDED".equals(job)?"SENT":
                            ("FAILED".equals(job)||"BLOCKED".equals(job))?"FAILED":"PENDING";
                    return new PendingActivation(rs.getObject("activation_id",UUID.class),rs.getString("full_name"),rs.getString("email"),
                            Set.of((String[])rs.getArray("roles").getArray()),rs.getObject("department_id",UUID.class),rs.getString("department_name"),
                            rs.getObject("occupation_reference_id",UUID.class),rs.getString("occupation_name"),rs.getTimestamp("created_at").toInstant(),
                            expires,clock.instant().isBefore(expires)?"PENDING":"EXPIRED",delivery);
                },organization);
    }
    @Override
    public List<Reference> references(UUID organization) {
        workspaces.require(identity.current().actor(),organization,Action.MEMBER_READ,clock.instant());
        return jdbc.query("""
                SELECT d.department_id,d.name,o.occupation_reference_id,o.name FROM platform.department_reference d
                JOIN platform.occupation_department_reference o ON o.department_id=d.department_id AND o.organization_id=d.organization_id
                WHERE d.organization_id=? AND d.active AND o.active ORDER BY d.name,o.name
                """,(rs,i)->new Reference(rs.getObject(1,UUID.class),rs.getString(2),rs.getObject(3,UUID.class),rs.getString(4)),organization);
    }
    @Override
    public void activate(String token,String password,String address) {
        if(token==null || !token.matches("[a-f0-9]{64}")) throw invalidProof();
        RegistrationFields.validatePassword(password);
        String hash=secrets.hashPassword(password);
        new AuthenticationAttemptGuard(security,secrets,clock).execute("activation",secrets.digest(token),address,()->{
            var ids=jdbc.query("SELECT activation_id,organization_id FROM platform.workspace_activation WHERE proof_hash=?",
                    (rs,i)->new Id(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class)),secrets.digest("activation:"+token));
            if(ids.isEmpty()) throw invalidProof();
            var id=ids.getFirst(); lock(id.organization());
            var activation=jdbc.queryForObject("SELECT * FROM platform.workspace_activation WHERE activation_id=? FOR UPDATE",
                    (rs,i)->new Activation(rs.getString("full_name"),rs.getString("email"),
                    Set.of((String[])rs.getArray("roles").getArray()),rs.getObject("department_id",UUID.class),
                    rs.getObject("occupation_reference_id",UUID.class),rs.getTimestamp("expires_at").toInstant(),
                    rs.getTimestamp("consumed_at")!=null),id.id());
            Instant now=clock.instant();
            if(activation==null || activation.consumed() || !now.isBefore(activation.expires())) throw invalidProof();
            if(activation.roles().size()!=1) throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "This invitation must specify exactly one role. Contact your administrator.");
            String status=jdbc.queryForObject("SELECT status FROM platform.organization WHERE organization_id=?",String.class,id.organization());
            var summary=workspaces.summary(id.organization(),now);
            if(!"ACTIVE".equals(status) || !"ACTIVE".equals(summary.subscriptionStatus())) throw new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN,"Workspace activation is unavailable while expired or suspended.");
            validateReferences(id.organization(),activation.roles(),activation.department(),activation.occupation());
            if(activation.roles().contains("EMPLOYEE") && summary.usedSeats()>=summary.admissionLimit()) throw new SubscriptionFailure(SubscriptionFailure.Code.CAPACITY_EXCEEDED,"No Employee seat is available. Contact your administrator.");
            security.lockEmail(activation.email());
            if(security.accountExists(activation.email())) throw new SubscriptionFailure(SubscriptionFailure.Code.CONFLICT,"The account already exists.");
            UUID account=UUID.randomUUID(),member=UUID.randomUUID();
            jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash,created_at) VALUES (?,?,?,?,?,?)",
                    account,id.organization(),activation.email(),activation.email(),hash,time(now));
            jdbc.update("INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES (?,?,?)",account,activation.name(),time(now));
            jdbc.update("""
                    INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,occupation_reference_id,created_at,updated_at)
                    VALUES (?,?,?,true,?,?,?,?)
                    """,member,account,id.organization(),activation.department(),activation.occupation(),time(now),time(now));
            for(String role:activation.roles()) jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?,?)",member,role);
            if(activation.roles().contains("EMPLOYEE")) jdbc.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)",account);
            jdbc.update("UPDATE platform.workspace_activation SET consumed_at=?,account_id=? WHERE activation_id=?",time(now),account,id.id());
            security.audit(account,"MEMBER_ACTIVATED","SUCCEEDED",now);
            return null;
        });
    }
    private void validateReferences(UUID organization,Set<String> roles,UUID department,UUID occupation) {
        JdbcMemberReferenceValidator.validate(jdbc,organization,roles,department,occupation,false);
    }
    private void lock(UUID organization) {
        if(jdbc.query("SELECT organization_id FROM platform.organization WHERE organization_id=? FOR UPDATE",(rs,i)->rs.getObject(1),organization).isEmpty()) throw invalidProof();
    }
    private static RegistrationFailure invalidProof() { return new RegistrationFailure(RegistrationFailure.Code.INVALID_PROOF,"The activation link is invalid, expired or already used."); }
    private static Timestamp time(Instant now) { return Timestamp.from(now); }
    private record Pending(UUID id,UUID organization,Instant sent) {}
    private record Id(UUID id,UUID organization) {}
    private record Activation(String name,String email,Set<String> roles,UUID department,UUID occupation,Instant expires,boolean consumed) {}
}
