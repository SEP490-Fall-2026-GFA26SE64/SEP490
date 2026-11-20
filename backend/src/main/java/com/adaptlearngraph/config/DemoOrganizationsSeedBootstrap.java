package com.adaptlearngraph.config;

import com.adaptlearngraph.config.DemoOrganizationsSeedData.Billing;
import com.adaptlearngraph.config.DemoOrganizationsSeedData.Dept;
import com.adaptlearngraph.config.DemoOrganizationsSeedData.Job;
import com.adaptlearngraph.config.DemoOrganizationsSeedData.Org;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.OrganizationStructure;
import com.adaptlearngraph.entities.domain.RequirementPathway;
import com.adaptlearngraph.entities.domain.RequirementPathway.CertificateReference;
import com.adaptlearngraph.entities.domain.RequirementPathway.Kind;
import com.adaptlearngraph.entities.domain.RequirementPathway.Plan;
import com.adaptlearngraph.entities.domain.RequirementPathway.Provision;
import com.adaptlearngraph.entities.domain.RequirementPathway.Requirement;
import com.adaptlearngraph.entities.domain.RequirementPathway.State;
import com.adaptlearngraph.entities.domain.RequirementPathway.Step;
import com.adaptlearngraph.repository.Neo4jCypher;
import com.adaptlearngraph.repository.Neo4jWorkspaceCatalogWriter;
import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.RequirementPathwayRevisions;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Idempotent local/demo seed of 20 organizations retained by the demo reset (see documents/testing/demo-organizations-accounts.md).
 * Organization #1 (Lotus Digital Solutions) is detailed for the Organization Administrator and L&D Manager dashboards.
 * Rows use deterministic ids and are inserted once; only time-sensitive demo states (pending invitations, running attempts,
 * subscription periods) are refreshed on each start so the dashboards stay representative.
 */
@Component
@Profile("workspace-baseline & local & !prod")
@Order(Ordered.LOWEST_PRECEDENCE)
public class DemoOrganizationsSeedBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoOrganizationsSeedBootstrap.class);

    public static final UUID DETAILED_ORG_ID = DemoOrganizationsSeedData.organizationId(1);
    public static final String DEFAULT_PASSWORD = "Password123!";
    private static final UUID TECHNOVA_ORG_ID = UUID.fromString("e0000000-0000-0000-0000-000000000001");
    private static final String FLOW = "REQUIREMENT_V1";
    private static final String[] LEVEL_NAMES = {"Associate", "Professional", "Senior"};
    private static final KnowledgeLevel[] KNOWLEDGE = {KnowledgeLevel.FOUNDATION, KnowledgeLevel.INTERMEDIATE, KnowledgeLevel.ADVANCED};
    private static final int DURATION_MONTHS = 6;

    enum Scenario { NONE, TARGET_ONLY, BASELINE_RUNNING, AWAITING_REVIEW, REJECTED, EXPERT_BLOCKED, IN_PROGRESS, AT_RISK, OVERDUE,
        COMPLETED_ON_TIME, COMPLETED_LATE }

    private static final Scenario[] DETAILED_CYCLE = Scenario.values();
    private static final Scenario[] LIGHT_CYCLE = {Scenario.IN_PROGRESS, Scenario.TARGET_ONLY, Scenario.AWAITING_REVIEW,
            Scenario.COMPLETED_ON_TIME, Scenario.NONE, Scenario.BASELINE_RUNNING, Scenario.OVERDUE};

    private record Person(UUID id, String fullName, String email, String role, boolean active, Dept dept, Job job,
                          DemoOrganizationsSeedData.Role target, int level, Scenario scenario, Instant joinedAt) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final ObjectMapper json;
    private final RegistrationSecrets secrets;
    private final ObjectProvider<Neo4jCypher> graphProvider;
    private final boolean enabled;

    public DemoOrganizationsSeedBootstrap(JdbcTemplate jdbc, ObjectMapper json, RegistrationSecrets secrets,
            ObjectProvider<Neo4jCypher> graphProvider, @Value("${workspace.dev-seed.enabled:true}") boolean enabled) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(new DataSourceTransactionManager(jdbc.getDataSource()));
        this.json = json;
        this.secrets = secrets;
        this.graphProvider = graphProvider;
        this.enabled = enabled;
    }

    /** TechNova plus every seeded demo organization; the demo reset keeps exactly these tenants. */
    public static Set<UUID> retainedOrganizations() {
        var ids = new LinkedHashSet<UUID>();
        ids.add(TECHNOVA_ORG_ID);
        DemoOrganizationsSeedData.ORGANIZATIONS.forEach(org -> ids.add(org.id()));
        return Set.copyOf(ids);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        String passwordHash = secrets.hashPassword(DEFAULT_PASSWORD);
        int seeded = 0;
        for (Org org : DemoOrganizationsSeedData.ORGANIZATIONS) {
            try {
                var people = people(org, now);
                transactions.executeWithoutResult(status -> seedPostgres(org, people, passwordHash, now));
                seedGraph(org, people, now);
                seeded++;
            } catch (RuntimeException e) {
                log.warn("Demo organization seed failed for {}: {}", org.name(), e.getMessage(), e);
            }
        }
        log.info("Demo organizations seeded: {}/{} (detailed: admin@lotus-digital.example.com / {})", seeded,
                DemoOrganizationsSeedData.ORGANIZATIONS.size(), DEFAULT_PASSWORD);
    }

    // ---------------------------------------------------------------- people

    private static List<Person> people(Org org, Instant now) {
        Instant founded = founded(org, now);
        var used = new HashSet<String>();
        var people = new ArrayList<Person>();
        people.add(staff(org, 0, "admin@" + org.domain(), "ORGANIZATION_ADMINISTRATOR", founded, used));
        people.add(staff(org, 1, "ld.manager@" + org.domain(), "LD_MANAGER", founded.plus(1, ChronoUnit.DAYS), used));
        for (int i = 0; i < org.experts(); i++)
            people.add(staff(org, 2 + i, null, "DOMAIN_EXPERT", founded.plus(2 + i, ChronoUnit.DAYS), used));
        var jobs = new ArrayList<Map.Entry<Dept, Job>>();
        org.departments().forEach(dept -> dept.jobs().forEach(job -> jobs.add(Map.entry(dept, job))));
        int inactive = org.detailed() ? 3 : (org.employees() >= 10 ? 1 : 0);
        Scenario[] cycle = org.detailed() ? DETAILED_CYCLE : LIGHT_CYCLE;
        for (int k = 0; k < org.employees(); k++) {
            var slot = jobs.get(k % jobs.size());
            var job = slot.getValue();
            var target = job.roles().get((k / jobs.size()) % job.roles().size());
            boolean active = k < org.employees() - inactive;
            Scenario scenario = active ? cycle[k % cycle.length] : Scenario.NONE;
            String[] n = DemoOrganizationsSeedData.name(org.number(), 10 + k);
            people.add(new Person(id("account", org.id(), "employee", k), full(n), email(n, org.domain(), used), "EMPLOYEE", active,
                    slot.getKey(), job, target, k % 3, scenario, founded.plus(5 + (long) k * 3, ChronoUnit.DAYS)));
        }
        return people;
    }

    private static Person staff(Org org, int index, String email, String role, Instant joined, Set<String> used) {
        String[] n = DemoOrganizationsSeedData.name(org.number(), index);
        String address = email == null ? email(n, org.domain(), used) : email;
        used.add(address);
        return new Person(id("account", org.id(), "staff", index), full(n), address, role, true, null, null, null, 0, Scenario.NONE, joined);
    }

    private static String full(String[] n) { return n[0] + " " + n[1] + " " + n[2]; }

    private static String email(String[] n, String domain, Set<String> used) {
        String base = (n[2] + "." + n[0]).toLowerCase(Locale.ROOT);
        String candidate = base + "@" + domain;
        for (int i = 2; used.contains(candidate); i++) candidate = base + i + "@" + domain;
        used.add(candidate);
        return candidate;
    }

    private static Instant founded(Org org, Instant now) {
        return now.truncatedTo(ChronoUnit.DAYS).minus(300 - org.number() * 9L, ChronoUnit.DAYS);
    }

    // ---------------------------------------------------------------- postgres

    private void seedPostgres(Org org, List<Person> people, String passwordHash, Instant now) {
        jdbc.execute("SET LOCAL session_replication_role = replica");
        UUID orgId = org.id();
        Instant founded = founded(org, now);
        Person admin = people.get(0);
        Person manager = people.get(1);
        update("""
                INSERT INTO platform.organization(organization_id, code, name, status, created_at) VALUES (?,?,?,?,?)
                ON CONFLICT (organization_id) DO NOTHING""", orgId, "SEED-" + org.code(), org.name(),
                org.suspended() ? "SUSPENDED" : "ACTIVE", ts(founded));
        for (Person p : people) {
            update("""
                    INSERT INTO platform.account(account_id, organization_id, identifier, normalized_identifier, password_hash, active, created_at)
                    VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING""", p.id(), orgId, p.email(), p.email(), passwordHash, p.active(), ts(p.joinedAt()));
            update("""
                    INSERT INTO platform.workspace_account_profile(account_id, full_name, email_verified_at, auth_version, recovery_required)
                    VALUES (?,?,?,0,false) ON CONFLICT DO NOTHING""", p.id(), p.fullName(), ts(p.joinedAt()));
        }
        UUID registration = id("registration", orgId);
        update("""
                INSERT INTO platform.organization_registration(registration_id, account_id, organization_name, workspace_slug, industry, headcount,
                    admin_name, state, email_verified_at, completed_at, created_at, updated_at, country, admin_phone, policies_accepted_at)
                VALUES (?,?,?,?,?,?,?,'REGISTERED',?,?,?,?,?,?,?) ON CONFLICT DO NOTHING""",
                registration, admin.id(), org.name(), org.slug(), org.industry(), org.headcount(), admin.fullName(),
                ts(founded), ts(founded), ts(founded), ts(founded), org.country(), String.format("+8490%07d", org.number() * 1111), ts(founded));
        update("""
                INSERT INTO platform.organization_workspace(workspace_id, organization_id, registration_id, slug, setup_state, created_at, ready_at)
                VALUES (?,?,?,?,'READY',?,?) ON CONFLICT DO NOTHING""", id("workspace", orgId), orgId, registration, org.slug(), ts(founded), ts(founded));
        seedSubscription(org, registration, admin, founded, now);
        seedReferences(org);
        for (Person p : people) seedMembership(org, p);
        seedInvitations(org, admin, now);
        UUID baselinePolicy = policy(orgId, "BASELINE", admin, manager, founded);
        UUID skillPolicy = policy(orgId, "SKILL_ASSESSMENT", admin, manager, founded);
        UUID expert = people.stream().filter(p -> p.role().equals("DOMAIN_EXPERT")).findFirst().orElse(manager).id();
        for (Person p : people)
            if (p.role().equals("EMPLOYEE") && p.scenario() != Scenario.NONE) seedLearner(org, p, expert, baselinePolicy, skillPolicy, now);
    }

    private void seedSubscription(Org org, UUID registration, Person admin, Instant founded, Instant now) {
        UUID orgId = org.id();
        UUID intent = id("intent", orgId);
        if (org.billing() == Billing.NONE) {
            update("""
                    INSERT INTO platform.subscription_intent(intent_id, kind, state, registration_id, owner_account_id, created_at, updated_at)
                    VALUES (?,'PURCHASE','OPEN',?,?,?,?) ON CONFLICT DO NOTHING""", intent, registration, admin.id(), ts(founded), ts(founded));
            return;
        }
        UUID plan = UUID.fromString(String.format("10000000-0000-4000-8000-%012d", org.plan()));
        var version = jdbc.queryForMap("""
                SELECT v.version_id, v.name, v.description, v.price_vnd, v.duration_months, v.employee_seats
                FROM platform.subscription_plan p JOIN platform.subscription_plan_version v ON v.version_id = p.current_version_id
                WHERE p.plan_id = ?""", plan);
        int months = ((Number) version.get("duration_months")).intValue();
        Instant ends = switch (org.billing()) {
            case EXPIRING -> now.plus(9, ChronoUnit.DAYS);
            case EXPIRED -> now.minus(15 + org.number(), ChronoUnit.DAYS);
            default -> plusMonths(now.minus(3 + org.number() % 8, ChronoUnit.DAYS), months);
        };
        Instant starts = plusMonths(ends, -months);
        Instant paid = starts.minus(1, ChronoUnit.HOURS);
        UUID order = id("order", orgId);
        update("""
                INSERT INTO platform.subscription_intent(intent_id, kind, state, registration_id, owner_account_id, applied_order_id, created_at, updated_at)
                VALUES (?,'PURCHASE','APPLIED',?,?,?,?,?) ON CONFLICT DO NOTHING""", intent, registration, admin.id(), order, ts(founded), ts(paid));
        long price = ((Number) version.get("price_vnd")).longValue();
        update("""
                INSERT INTO platform.payment_order(order_id, intent_id, created_by, attempt, plan_id, plan_version_id, name, description, price_vnd,
                    currency, duration_months, employee_seats, idempotency_key, request_digest, payment_status, observed_paid_amount, paid_at,
                    created_at, expires_at)
                VALUES (?,?,?,1,?,?,?,?,?,'VND',?,?,?,?,'PAID',?,?,?,?) ON CONFLICT DO NOTHING""",
                order, intent, admin.id(), plan, version.get("version_id"), version.get("name"), version.get("description"), price,
                months, version.get("employee_seats"), id("idempotency", orgId), RoleBaselineFlow.hash("seed-order:" + orgId), price,
                ts(paid), ts(paid.minus(10, ChronoUnit.MINUTES)), ts(paid.plus(20, ChronoUnit.MINUTES)));
        UUID subscription = id("subscription", orgId);
        update("INSERT INTO platform.subscription(subscription_id, organization_id, created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING",
                subscription, orgId, ts(paid));
        // Period dates are refreshed relative to today so the seeded subscription status stays as designed.
        update("""
                INSERT INTO platform.subscription_period(period_id, subscription_id, order_id, starts_at, ends_at, billing_zone, anniversary_day, created_at)
                VALUES (?,?,?,?,?,'Asia/Ho_Chi_Minh',?,?)
                ON CONFLICT (period_id) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, anniversary_day = EXCLUDED.anniversary_day""",
                id("period", orgId), subscription, order, ts(starts), ts(ends), starts.atZone(ZoneOffset.UTC).getDayOfMonth(), ts(paid));
    }

    private void seedReferences(Org org) {
        String orgId = org.id().toString();
        for (Dept dept : org.departments()) {
            UUID deptId = UUID.fromString(Neo4jWorkspaceCatalogWriter.importedId(orgId, "Department", dept.code()));
            update("INSERT INTO platform.department_reference(department_id, organization_id, name, active) VALUES (?,?,?,true) ON CONFLICT DO NOTHING",
                    deptId, org.id(), dept.name());
            for (Job job : dept.jobs()) {
                UUID jobId = UUID.fromString(Neo4jWorkspaceCatalogWriter.importedId(orgId, "JobPosition", job.code()));
                // Admin-owned employment placement uses the existing "Name || TR:id::code::name::level" reference encoding.
                DemoOrganizationsSeedData.Role placement = job.roles().get(0);
                String name = job.name() + " || TR:" + Neo4jWorkspaceCatalogWriter.importedId(orgId, "TargetRole", placement.code())
                        + "::" + placement.code() + "::" + placement.name() + "::";
                update("""
                        INSERT INTO platform.job_position_department_reference(job_position_reference_id, job_position_id, organization_id,
                            department_id, name, active) VALUES (?,?,?,?,?,true)
                        ON CONFLICT (job_position_reference_id) DO UPDATE SET name = EXCLUDED.name
                        WHERE platform.job_position_department_reference.name NOT LIKE '%|| TR:%'""", jobId, jobId, org.id(), deptId, name);
            }
        }
    }

    private void seedMembership(Org org, Person p) {
        UUID membership = UUID.nameUUIDFromBytes(("membership:" + p.id()).getBytes(StandardCharsets.UTF_8));
        UUID dept = p.dept() == null ? null : deptId(org, p.dept());
        UUID job = p.job() == null ? null : jobId(org, p.job());
        update("""
                INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, active, department_id,
                    job_position_reference_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING""",
                membership, p.id(), org.id(), p.active(), dept, job, ts(p.joinedAt()), ts(p.joinedAt()));
        update("INSERT INTO platform.organization_membership_role(membership_id, role_code) VALUES (?,?) ON CONFLICT DO NOTHING", membership, p.role());
    }

    private record Invite(String role, boolean pending, String delivery, int ageDays) {}

    private void seedInvitations(Org org, Person admin, Instant now) {
        List<Invite> invites = org.detailed() ? List.of(
                new Invite("EMPLOYEE", true, "SENT", 0), new Invite("EMPLOYEE", true, "SENT", 0), new Invite("EMPLOYEE", true, "FAILED", 0),
                new Invite("EMPLOYEE", true, "NOT_REQUESTED", 0), new Invite("DOMAIN_EXPERT", true, "SENT", 0),
                new Invite("EMPLOYEE", false, "SENT", 3), new Invite("EMPLOYEE", false, "FAILED", 6), new Invite("LD_MANAGER", false, "SENT", 12))
                : org.number() % 3 == 0 ? List.of(new Invite("EMPLOYEE", true, "SENT", 0), new Invite("EMPLOYEE", false, "SENT", 4))
                : List.of(new Invite("EMPLOYEE", org.number() % 2 == 0, "SENT", org.number() % 2 == 0 ? 0 : 5));
        for (int i = 0; i < invites.size(); i++) {
            Invite invite = invites.get(i);
            UUID activation = id("activation", org.id(), i);
            String[] n = DemoOrganizationsSeedData.name(org.number(), 80 + i);
            String email = ("invite" + (i + 1) + "." + n[2] + "@" + org.domain()).toLowerCase(Locale.ROOT);
            boolean employee = invite.role().equals("EMPLOYEE");
            var dept = org.departments().get(i % org.departments().size());
            var job = employee ? dept.jobs().get(0) : null;
            Instant sent = invite.pending() ? now.minus(1, ChronoUnit.MINUTES) : now.minus(invite.ageDays(), ChronoUnit.DAYS);
            String sql = """
                    INSERT INTO platform.workspace_activation(activation_id, organization_id, created_by, full_name, email, roles, department_id,
                        job_position_reference_id, proof_hash, generation, expires_at, created_at, last_sent_at)
                    VALUES (?,?,?,?,?,?::text[],?,?,?,1,?,?,?) ON CONFLICT (activation_id) DO """
                    + (invite.pending() ? " UPDATE SET last_sent_at = EXCLUDED.last_sent_at, expires_at = EXCLUDED.expires_at "
                            + "WHERE platform.workspace_activation.consumed_at IS NULL" : " NOTHING");
            update(sql, activation, org.id(), admin.id(), full(n), email, "{" + invite.role() + "}", employee ? deptId(org, dept) : null,
                    employee ? jobId(org, job) : null, RoleBaselineFlow.hash("seed-activation:" + activation), ts(sent.plus(10, ChronoUnit.MINUTES)),
                    ts(sent.minus(1, ChronoUnit.HOURS)), ts(sent));
            if (invite.delivery().equals("NOT_REQUESTED")) continue;
            UUID event = id("activation-event", activation);
            update("""
                    INSERT INTO platform.outbox_event(event_id, event_type, aggregate_id, source_revision, payload, correlation_id, created_at, delivered_at)
                    VALUES (?,'MEMBER_ACTIVATION',?,1,'{}'::jsonb,?,?,?) ON CONFLICT DO NOTHING""", event, activation, id("correlation", activation),
                    ts(sent), ts(sent));
            boolean failed = invite.delivery().equals("FAILED");
            update("""
                    INSERT INTO platform.processing_job(job_id, event_id, handler, status, attempts, failure_code, created_at)
                    VALUES (?,?,'MEMBER_ACTIVATION_EMAIL',?,?,?,?) ON CONFLICT DO NOTHING""", id("activation-job", activation), event,
                    failed ? "FAILED" : "SUCCEEDED", failed ? 5 : 1, failed ? "SMTP_UNAVAILABLE" : null, ts(sent));
        }
    }

    private UUID policy(UUID orgId, String purpose, Person admin, Person manager, Instant founded) {
        UUID policy = id("policy", orgId, purpose);
        update("""
                INSERT INTO platform.assessment_rule_policy_version(id, organization_id, purpose, version, configuration, configuration_hash,
                    created_by, created_at, published_by, published_at) VALUES (?,?,?,1,'{}'::jsonb,?,?,?,?,?) ON CONFLICT DO NOTHING""",
                policy, orgId, purpose, RoleBaselineFlow.hash("seed-policy:" + policy), admin.id(), ts(founded), manager.id(), ts(founded));
        return policy;
    }

    // ---------------------------------------------------------------- learner development

    private void seedLearner(Org org, Person p, UUID expert, UUID baselinePolicy, UUID skillPolicy, Instant now) {
        UUID orgId = org.id();
        UUID learner = p.id();
        Scenario s = p.scenario();
        var target = p.target();
        String roleId = Neo4jWorkspaceCatalogWriter.importedId(orgId.toString(), "TargetRole", target.code());
        String levelId = levelId(org, target, p.level());
        String levelName = LEVEL_NAMES[p.level()];
        KnowledgeLevel knowledge = KNOWLEDGE[p.level()];
        List<String> skills = target.skills();

        Instant start = switch (s) {
            case IN_PROGRESS -> now.minus(45, ChronoUnit.DAYS);
            case AT_RISK -> plusMonths(now, -DURATION_MONTHS).plus(12, ChronoUnit.DAYS);
            case OVERDUE -> plusMonths(now, -DURATION_MONTHS - 1);
            case COMPLETED_ON_TIME -> plusMonths(now, -5);
            case COMPLETED_LATE -> plusMonths(now, -DURATION_MONTHS - 2);
            case REJECTED -> now.minus(9, ChronoUnit.DAYS);
            case EXPERT_BLOCKED -> now.minus(6, ChronoUnit.DAYS);
            default -> now.minus(4, ChronoUnit.DAYS);
        };
        Instant pathwayCreated = start.minus(2, ChronoUnit.DAYS);
        Instant baselineFinished = pathwayCreated.minus(1, ChronoUnit.HOURS);
        Instant baselineStarted = baselineFinished.minus(40, ChronoUnit.MINUTES);
        Instant selected = s == Scenario.TARGET_ONLY || s == Scenario.BASELINE_RUNNING
                ? now.minus(2 + p.level(), ChronoUnit.DAYS) : baselineStarted.minus(1, ChronoUnit.DAYS);

        UUID selection = id("selection", learner);
        update("INSERT INTO platform.learner_state(learner_id, target_revision) VALUES (?,1) ON CONFLICT DO NOTHING", learner);
        update("""
                INSERT INTO platform.employee_role_selection(selection_id, organization_id, learner_id, role_id, job_position_id, role_snapshot,
                    target_revision, selected_at) VALUES (?,?,?,?,?,?::jsonb,1,?) ON CONFLICT DO NOTHING""",
                selection, orgId, learner, roleId, jobId(org, p.job()).toString(),
                write(roleSnapshot(org, p.job(), target, levelId)), ts(selected));
        if (s == Scenario.TARGET_ONLY) return;

        UUID baseline = id("attempt", learner, "baseline");
        String context = write(context(target.name(), levelName, skills, org, knowledge));
        if (s == Scenario.BASELINE_RUNNING) {
            // Refreshed on start so the attempt stays running instead of being finalized at its deadline.
            update("""
                    INSERT INTO platform.rule_assessment_attempt(id, organization_id, learner_id, purpose, context_key, selection_id, selection_revision,
                        policy_id, policy_hash, context_snapshot, state, revision, started_at, deadline_at, processing_status)
                    VALUES (?,?,?,'BASELINE',?,?,1,?,?,?::jsonb,'IN_PROGRESS',1,?,?,'PENDING')
                    ON CONFLICT (id) DO UPDATE SET started_at = EXCLUDED.started_at, deadline_at = EXCLUDED.deadline_at
                    WHERE platform.rule_assessment_attempt.state = 'IN_PROGRESS'""",
                    baseline, orgId, learner, "seed:baseline:" + learner, selection, baselinePolicy, policyHash(baselinePolicy), context,
                    ts(now.minus(15, ChronoUnit.MINUTES)), ts(now.plus(2, ChronoUnit.DAYS)));
            return;
        }

        boolean completed = s == Scenario.COMPLETED_ON_TIME || s == Scenario.COMPLETED_LATE;
        int baselinePassed = completed ? Math.min(2, skills.size()) : 1;
        finalizedAttempt(org, learner, baseline, "BASELINE", "seed:baseline:" + learner, selection, baselinePolicy, context,
                baselineStarted, baselineFinished, skills, knowledge, baselinePassed);
        if (s == Scenario.REJECTED || s == Scenario.OVERDUE) {
            String skill = skills.get(skills.size() - 1);
            update("""
                    INSERT INTO platform.skill_knowledge_review(id, organization_id, learner_id, skill_id, knowledge_level, attempt_id, group_id, state,
                        reason, created_at) VALUES (?,?,?,?,?,?,?,'NEED_REVIEW',?,?) ON CONFLICT DO NOTHING""",
                    id("review", learner), orgId, learner, skillId(org, skill), knowledge.name(), baseline, id("group", baseline, skill),
                    "Baseline answers for " + skill + " were inconsistent and need Domain Expert review", ts(baselineFinished));
        }

        int fulfilled = switch (s) {
            case COMPLETED_ON_TIME, COMPLETED_LATE -> skills.size();
            case IN_PROGRESS -> Math.min(2, skills.size());
            default -> 1;
        };
        boolean assessed = (s == Scenario.IN_PROGRESS || completed) && fulfilled > baselinePassed;
        UUID skillAttempt = id("attempt", learner, "skill");
        UUID request = id("request", learner);
        var steps = new ArrayList<Step>();
        for (int i = 0; i < skills.size(); i++) {
            String skill = skills.get(i);
            State state;
            if (i < fulfilled) state = State.FULFILLED;
            else if (s == Scenario.EXPERT_BLOCKED && i == fulfilled) state = State.NEEDS_EXPERT_ACTION;
            else if ((s == Scenario.IN_PROGRESS || s == Scenario.AT_RISK || s == Scenario.OVERDUE) && i == fulfilled) state = State.IN_PROGRESS;
            else state = State.NEEDS_SUPPLEMENTATION;
            Provision provision = state == State.FULFILLED ? Provision.MODULE_ONLY
                    : state == State.NEEDS_EXPERT_ACTION ? Provision.UNCONFIGURED : Provision.CERTIFICATE_ONLY;
            var requirement = new Requirement(skillId(org, skill), skill, knowledge, "1", List.of(), provision);
            UUID evidence = null;
            if (state == State.FULFILLED) {
                Instant achieved;
                UUID source;
                String kind;
                if (i < baselinePassed) { achieved = baselineFinished; source = baseline; kind = "MODULE_ASSESSMENT"; }
                else if (assessed && i == baselinePassed) {
                    achieved = between(start, completedAt(s, start, now), 0.4); source = skillAttempt; kind = "MODULE_ASSESSMENT";
                } else {
                    achieved = between(start, completedAt(s, start, now), (i + 1.0) / (skills.size() + 1)); source = id("certificate", learner, skill);
                    kind = "CERTIFICATE";
                }
                if (s == Scenario.IN_PROGRESS && i >= baselinePassed) achieved = between(start, now, 0.5);
                evidence = id("evidence", learner, skill);
                update("""
                        INSERT INTO platform.skill_knowledge_evidence(id, organization_id, learner_id, skill_id, knowledge_level, requirement_snapshot,
                            source_kind, source_id, source_version, achieved_at) VALUES (?,?,?,?,?,?::jsonb,?,?,1,?) ON CONFLICT DO NOTHING""",
                        evidence, orgId, learner, skillId(org, skill), knowledge.name(),
                        write(Map.of("skillName", skill, "skillVersion", "1")), kind, source, ts(achieved));
            }
            CertificateReference certificate = provision == Provision.CERTIFICATE_ONLY ? new CertificateReference(
                    "cert-" + slug(skill), "1", skill + " Professional Certificate", "https://learn.example.com/certificates/" + slug(skill)) : null;
            String reason = switch (state) {
                case FULFILLED -> "Verified " + knowledge.name().toLowerCase(Locale.ROOT) + " knowledge evidence";
                case NEEDS_EXPERT_ACTION -> "No learning provision is configured yet; a Domain Expert must configure one";
                case IN_PROGRESS -> "Learner is working toward the certificate";
                default -> "Certificate evidence is required to close this gap";
            };
            steps.add(new Step(RequirementPathway.stepId(request, requirement, Kind.REQUIRED, null), requirement, Kind.REQUIRED, null, state,
                    reason, evidence, List.of(), certificate));
        }
        if (assessed) {
            String skill = skills.get(baselinePassed);
            Instant finished = between(start, completedAt(s, start, now), 0.4);
            if (s == Scenario.IN_PROGRESS) finished = between(start, now, 0.5);
            finalizedAttempt(org, learner, skillAttempt, "SKILL_ASSESSMENT", "seed:skill:" + learner, selection, skillPolicy,
                    write(context(target.name(), levelName, List.of(skill), org, knowledge)), finished.minus(30, ChronoUnit.MINUTES), finished,
                    List.of(skill), knowledge, 1);
        }
        Plan plan = new Plan(steps, List.of());
        seedPathway(org, p, request, selection, plan, s, target.name(), levelName, roleId, levelId, expert, pathwayCreated, start, now);
    }

    private void finalizedAttempt(Org org, UUID learner, UUID attempt, String purpose, String contextKey, UUID selection, UUID policy, String context,
            Instant started, Instant finished, List<String> skills, KnowledgeLevel knowledge, int passed) {
        update("""
                INSERT INTO platform.rule_assessment_attempt(id, organization_id, learner_id, purpose, context_key, selection_id, selection_revision,
                    policy_id, policy_hash, context_snapshot, state, revision, started_at, deadline_at, finished_at, finish_reason, processing_status)
                VALUES (?,?,?,?,?,?,1,?,?,?::jsonb,'FINALIZED',2,?,?,?,'SUBMITTED','PROCESSED') ON CONFLICT DO NOTHING""",
                attempt, org.id(), learner, purpose, contextKey, selection, policy, policyHash(policy), context, ts(started),
                ts(started.plus(60, ChronoUnit.MINUTES)), ts(finished));
        for (int i = 0; i < skills.size(); i++) {
            String skill = skills.get(i);
            UUID group = id("group", attempt, skill);
            boolean pass = i < passed;
            update("""
                    INSERT INTO platform.rule_assessment_group(attempt_id, group_id, organization_id, learner_id, skill_id, knowledge_level, outcome_codes,
                        group_role, total_count, required_correct_count, mandatory_required, all_wrong_veto, mandatory_count)
                    VALUES (?,?,?,?,?,?,'[]'::jsonb,'TARGET',5,3,false,false,0) ON CONFLICT DO NOTHING""",
                    attempt, group, org.id(), learner, skillId(org, skill), knowledge.name());
            update("""
                    INSERT INTO platform.rule_assessment_group_result(attempt_id, group_id, correct_count, total_count, mandatory_satisfied, passed,
                        veto_triggered, reasons, finalized_at) VALUES (?,?,?,5,true,?,false,'[]'::jsonb,?) ON CONFLICT DO NOTHING""",
                    attempt, group, pass ? 4 + (i % 2) : 1 + (i % 2), pass, ts(finished));
        }
    }

    private void seedPathway(Org org, Person p, UUID request, UUID selection, Plan plan, Scenario s, String roleName, String levelName,
            String roleId, String levelId, UUID expert, Instant created, Instant start, Instant now) {
        UUID orgId = org.id();
        UUID learner = p.id();
        UUID snapshot = id("requirement-snapshot", learner);
        String requirements = write(Map.of("roleName", roleName, "levelName", levelName,
                "requirements", plan.steps().stream().map(step -> step.requirement()).toList()));
        update("""
                INSERT INTO platform.pathway_requirement_snapshot(id, organization_id, learner_id, selection_id, selection_revision, content_hash,
                    snapshot, created_at) VALUES (?,?,?,?,1,?,?::jsonb,?) ON CONFLICT DO NOTHING""",
                snapshot, orgId, learner, selection, RoleBaselineFlow.hash(requirements), requirements, ts(created));
        var binding = new LinkedHashMap<String, Object>();
        binding.put("roleName", roleName);
        binding.put("levelName", levelName);
        update("""
                INSERT INTO platform.initial_pathway_request(request_id, organization_id, learner_id, selection_id, selection_revision,
                    requirement_snapshot_id, planning_input_hash, algorithm_version, configuration_version, frozen_input, generation_status,
                    flow_version, created_at) VALUES (?,?,?,?,1,?,?,'requirement-v1','seed-1',?::jsonb,'SUCCEEDED',?,?) ON CONFLICT DO NOTHING""",
                request, orgId, learner, selection, snapshot, RoleBaselineFlow.hash("seed-input:" + request),
                write(Map.of("input", Map.of("binding", binding))), FLOW, ts(created));
        UUID run = id("run", request);
        update("""
                INSERT INTO platform.initial_pathway_run(run_id, request_id, claim_token, worker_version, generation_status, diagnostics, finished_at)
                VALUES (?,?,?,'seed','SUCCEEDED','[]'::jsonb,?) ON CONFLICT DO NOTHING""", run, request, id("claim", request), ts(created));
        String content = write(new RequirementPathwayRevisions.Content(FLOW, plan));
        String hash = RoleBaselineFlow.hash(content);
        update("""
                INSERT INTO platform.initial_pathway_revision(request_id, revision, organization_id, learner_id, selection_id, selection_revision, run_id,
                    content_hash, validation_status, content, created_at, format_version, change_origin)
                VALUES (?,1,?,?,?,1,?,?,'VALID',?::jsonb,?,3,'INITIAL') ON CONFLICT DO NOTHING""",
                request, orgId, learner, selection, run, hash, content, ts(created));
        update("""
                INSERT INTO platform.pathway_requirement_step(request_id, revision, step_id, organization_id, learner_id, skill_id, knowledge_level,
                    requirement_snapshot, provision, certificate_id, certificate_version, kind, source_bypass_id, state, reason, ordinal, fulfilled_evidence_id)
                SELECT ?,1,CAST(step->>'id' AS uuid),?,?,step->'requirement'->>'skillId',step->'requirement'->>'knowledgeLevel',
                    step->'requirement',step->'requirement'->>'provision',step->'certificate'->>'id',step->'certificate'->>'version',step->>'kind',
                    CAST(step->>'sourceBypassId' AS uuid),step->>'state',step->>'reason',ordinal::integer,CAST(step->>'fulfilledEvidenceId' AS uuid)
                FROM jsonb_array_elements(CAST(? AS jsonb)->'steps') WITH ORDINALITY AS projected(step,ordinal)
                ON CONFLICT DO NOTHING""", request, orgId, learner, write(plan));

        boolean timed = switch (s) {
            case IN_PROGRESS, AT_RISK, OVERDUE, COMPLETED_ON_TIME, COMPLETED_LATE -> true;
            default -> false;
        };
        String review = switch (s) {
            case AWAITING_REVIEW -> "AWAITING_EXPERT_REVIEW";
            case REJECTED -> "REJECTED";
            case EXPERT_BLOCKED -> "NONE";
            default -> "APPROVED";
        };
        Instant deadline = timed ? plusMonths(start, DURATION_MONTHS) : null;
        Instant completed = s == Scenario.COMPLETED_ON_TIME || s == Scenario.COMPLETED_LATE ? completedAt(s, start, now) : null;
        String basis = timed ? write(Map.of("roleId", roleId, "roleVersion", "1", "levelId", levelId, "catalogVersion", "1.0",
                "catalogFingerprint", fingerprint(org, roleId), "durationMonths", DURATION_MONTHS, "zone", "UTC")) : null;
        update("""
                INSERT INTO platform.initial_pathway_current(request_id, organization_id, learner_id, selection_id, selection_revision, current_revision,
                    review_status, timing_duration_months, timing_basis, timing_started_at, timing_deadline_at, timing_completed_at, timing_on_time)
                VALUES (?,?,?,?,1,1,?,?,?::jsonb,?,?,?,?) ON CONFLICT DO NOTHING""",
                request, orgId, learner, selection, review, timed ? DURATION_MONTHS : null, basis, timed ? ts(start) : null, ts(deadline),
                ts(completed), completed == null ? null : !completed.isAfter(deadline));
        if (review.equals("APPROVED"))
            update("""
                    INSERT INTO platform.initial_pathway_approval(request_id, revision, content_hash, organization_id, expert_id, assignment_id,
                        assignment_version, confirmed_at) VALUES (?,1,?,?,?,?,1,?) ON CONFLICT DO NOTHING""",
                    request, hash, orgId, expert, id("assignment", request), ts(start));
    }

    private static Instant completedAt(Scenario s, Instant start, Instant now) {
        return switch (s) {
            case COMPLETED_ON_TIME -> now.minus(10, ChronoUnit.DAYS);
            case COMPLETED_LATE -> now.minus(20, ChronoUnit.DAYS);
            default -> now;
        };
    }

    private static Instant between(Instant from, Instant to, double fraction) {
        return from.plusSeconds((long) ((to.getEpochSecond() - from.getEpochSecond()) * fraction));
    }

    private Map<String, Object> context(String roleName, String levelName, List<String> skills, Org org, KnowledgeLevel knowledge) {
        var requirements = skills.stream().map(skill -> Map.of("skillName", skill, "requirement",
                Map.of("skillId", skillId(org, skill), "skillName", skill, "knowledgeLevel", knowledge.name()))).toList();
        var context = new LinkedHashMap<String, Object>();
        context.put("roleName", roleName);
        context.put("levelName", levelName);
        context.put("learningContext", "ROLE_PATHWAY");
        context.put("policyScopeKey", "seed");
        context.put("requirements", requirements);
        return Map.of("context", context);
    }

    private Map<String, Object> roleSnapshot(Org org, Job job, DemoOrganizationsSeedData.Role target, String levelId) {
        String orgId = org.id().toString();
        String roleId = Neo4jWorkspaceCatalogWriter.importedId(orgId, "TargetRole", target.code());
        var levels = new ArrayList<RoleBaselineFlow.Level>();
        for (int rank = 0; rank < LEVEL_NAMES.length; rank++) {
            String level = KNOWLEDGE[rank].name();
            var skills = target.skills().stream().map(skill -> new RoleBaselineFlow.Skill(skillId(org, skill), "SK-" + slug(skill).toUpperCase(Locale.ROOT),
                    skill, List.of(level), true)).toList();
            levels.add(new RoleBaselineFlow.Level(levelId(org, target, rank), "L" + (rank + 1), LEVEL_NAMES[rank], rank + 1, target.scope(),
                    "ALL_MANDATORY_SKILLS", skills, DURATION_MONTHS + " months"));
        }
        var role = new RoleBaselineFlow.Role(roleId, target.code(), target.name(), target.scope(), jobId(org, job).toString(), job.name(),
                "1.0", fingerprint(org, roleId), levels, "1");
        var snapshot = new LinkedHashMap<String, Object>();
        snapshot.put("snapshotVersion", 1);
        snapshot.put("role", role);
        snapshot.put("levelId", levelId);
        return snapshot;
    }

    // ---------------------------------------------------------------- graph

    private void seedGraph(Org org, List<Person> people, Instant now) {
        Neo4jCypher graph = graphProvider.getIfAvailable();
        if (graph == null) return;
        String orgId = org.id().toString();
        long existing = graph.read(tx -> tx.single("MATCH (d:Department {organizationId: $org}) RETURN count(d) AS n", Map.of("org", orgId))
                .get("n").asLong());
        if (existing > 0) return;
        var departments = org.departments().stream().map(dept -> new OrganizationStructure.Department(dept.code(), dept.name(), dept.description(),
                dept.jobs().stream().map(job -> new OrganizationStructure.JobPosition(job.code(), job.name(),
                        job.roles().stream().map(role -> new OrganizationStructure.TargetRole(role.code(), role.name(), role.scope(),
                                java.util.stream.IntStream.range(0, LEVEL_NAMES.length)
                                        .mapToObj(rank -> new OrganizationStructure.Level("L" + (rank + 1), LEVEL_NAMES[rank], rank + 1)).toList()))
                                .toList())).toList())).toList();
        new Neo4jWorkspaceCatalogWriter(() -> graph).writeStructure(orgId, new OrganizationStructure(departments), now);
        var published = people.stream().filter(p -> p.target() != null)
                .map(p -> Neo4jWorkspaceCatalogWriter.importedId(orgId, "TargetRole", p.target().code())).distinct().toList();
        graph.write(tx -> {
            tx.execute("MATCH (r:TargetRole {organizationId: $org}) WHERE r.id IN $ids SET r.status = 'PUBLISHED'",
                    Map.of("org", orgId, "ids", published));
            return null;
        });
    }

    // ---------------------------------------------------------------- helpers

    private static UUID deptId(Org org, Dept dept) {
        return UUID.fromString(Neo4jWorkspaceCatalogWriter.importedId(org.id().toString(), "Department", dept.code()));
    }

    private static UUID jobId(Org org, Job job) {
        return UUID.fromString(Neo4jWorkspaceCatalogWriter.importedId(org.id().toString(), "JobPosition", job.code()));
    }

    private static String levelId(Org org, DemoOrganizationsSeedData.Role role, int rank) {
        return Neo4jWorkspaceCatalogWriter.importedId(org.id().toString(), "Level", role.code() + ":" + (rank + 1));
    }

    private static String skillId(Org org, String skill) {
        return id("skill", org.id(), skill).toString();
    }

    private static String fingerprint(Org org, String roleId) {
        return RoleBaselineFlow.hash("seed-catalog:" + org.id() + ":" + roleId);
    }

    private static String policyHash(UUID policy) {
        return RoleBaselineFlow.hash("seed-policy:" + policy);
    }

    private static String slug(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private static Instant plusMonths(Instant instant, int months) {
        return instant.atZone(ZoneOffset.UTC).plusMonths(months).toInstant();
    }

    private static UUID id(String kind, Object... parts) {
        var key = new StringBuilder("demo-seed:").append(kind);
        for (Object part : parts) key.append(':').append(part);
        return UUID.nameUUIDFromBytes(key.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static Timestamp ts(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Demo seed JSON serialization failed", e);
        }
    }

    private void update(String sql, Object... args) {
        jdbc.update(sql, args);
    }
}
