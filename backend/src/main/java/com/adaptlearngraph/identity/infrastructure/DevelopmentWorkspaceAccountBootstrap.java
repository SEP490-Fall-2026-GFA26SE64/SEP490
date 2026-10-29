package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.neo4j.driver.Driver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Idempotent bootstrap for local development and live testing.
 * Seeds a verified TechNova organization with active subscription, workspace,
 * and authenticated accounts for Domain Expert, L&D Manager, Employee, and Admin.
 */
@Component
@Profile("workspace-baseline & local & !prod")
public final class DevelopmentWorkspaceAccountBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DevelopmentWorkspaceAccountBootstrap.class);

    public static final UUID TECHNOVA_ORG_ID = UUID.fromString("e0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_WORKSPACE_ID = UUID.fromString("e0000000-0000-0000-0000-000000000002");
    public static final UUID TECHNOVA_REGISTRATION_ID = UUID.fromString("e0000000-0000-0000-0000-000000000003");
    public static final UUID TECHNOVA_INTENT_ID = UUID.fromString("b0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_ORDER_ID = UUID.fromString("b0000000-0000-0000-0000-000000000002");
    public static final UUID TECHNOVA_IDEMPOTENCY_KEY = UUID.fromString("b0000000-0000-0000-0000-000000000003");

    public static final UUID TECHNOVA_DEPT_ID = UUID.fromString("d0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_OCC_REF_ID = UUID.fromString("f0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_OCC_ID = UUID.fromString("f0000000-0000-0000-0000-000000000002");
    public static final UUID TECHNOVA_SUB_ID = UUID.fromString("c0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_PERIOD_ID = UUID.fromString("c0000000-0000-0000-0000-000000000002");

    public static final UUID PLAN_ENTERPRISE_ID = UUID.fromString("10000000-0000-4000-8000-000000000003");
    public static final UUID PLAN_ENTERPRISE_VERSION_ID = UUID.fromString("20000000-0000-4000-8000-000000000003");

    public static final UUID ADMIN_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000000");
    public static final UUID MANAGER_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    public static final UUID EXPERT_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000002");
    public static final UUID EMPLOYEE_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000003");
    public static final UUID EXPERT_MARCUS_VANCE_ID = UUID.fromString("a0000000-0000-0000-0000-000000000005");
    public static final UUID EXPERT_ALEX_RIVERA_ID = UUID.fromString("a0000000-0000-0000-0000-000000000006");
    public static final UUID EXPERT_LINH_NGUYEN_ID = UUID.fromString("a0000000-0000-0000-0000-000000000007");

    public static final String DEFAULT_PASSWORD = "Password123!";

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final RegistrationSecrets secrets;
    private final ObjectProvider<Driver> driverProvider;
    private final boolean enabled;

    public DevelopmentWorkspaceAccountBootstrap(
            JdbcTemplate jdbc,
            PlatformTransactionManager manager,
            RegistrationSecrets secrets,
            ObjectProvider<Driver> driverProvider,
            @Value("${workspace.dev-seed.enabled:true}") boolean enabled) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(manager);
        this.secrets = secrets;
        this.driverProvider = driverProvider;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        try {
            transactions.executeWithoutResult(status -> seedPostgres());
            seedNeo4j();
            log.info("Development workspace seeded successfully: TechNova (expert@technova.com, manager@technova.com / Password123!)");
        } catch (Exception ex) {
            log.warn("Development workspace seed notice: {}", ex.getMessage());
        }
    }

    private void seedPostgres() {
        // 1. Organization
        jdbc.update("""
                INSERT INTO platform.organization(organization_id, code, name, status, created_at)
                VALUES (?, 'TECHNOVA', 'TechNova Cognitive Labs', 'ACTIVE', now())
                ON CONFLICT (organization_id) DO UPDATE SET status = 'ACTIVE', name = 'TechNova Cognitive Labs'
                """, TECHNOVA_ORG_ID);

        // 2. Department Reference
        jdbc.update("""
                INSERT INTO platform.department_reference(department_id, organization_id, name, active)
                VALUES (?, ?, 'Engineering & Cognitive Systems', true)
                ON CONFLICT (department_id) DO UPDATE SET active = true
                """, TECHNOVA_DEPT_ID, TECHNOVA_ORG_ID);

        // 3. Occupation Department Reference
        jdbc.update("""
                INSERT INTO platform.occupation_department_reference(occupation_reference_id, occupation_id, organization_id, department_id, name, active)
                VALUES (?, ?, ?, ?, 'Software Developers', true)
                ON CONFLICT (occupation_reference_id) DO UPDATE SET active = true
                """, TECHNOVA_OCC_REF_ID, TECHNOVA_OCC_ID, TECHNOVA_ORG_ID, TECHNOVA_DEPT_ID);

        // 4. Seed Member Accounts (Admin, Manager, Expert, Employee)
        String passwordHash = secrets.hashPassword(DEFAULT_PASSWORD);
        seedMember(ADMIN_ACCOUNT_ID, "admin@technova.com", "Elena Rostova", "ORGANIZATION_ADMINISTRATOR", passwordHash, null, null);
        seedMember(MANAGER_ACCOUNT_ID, "manager@technova.com", "Sarah Connor", "LD_MANAGER", passwordHash, null, null);
        seedMember(EXPERT_ACCOUNT_ID, "expert@technova.com", "Dr. Sarah Chen", "DOMAIN_EXPERT", passwordHash, null, null);
        seedMember(EXPERT_ALEX_RIVERA_ID, "alex.rivera@technova.com", "Alex Rivera", "DOMAIN_EXPERT", passwordHash, null, null);
        seedMember(EXPERT_LINH_NGUYEN_ID, "linh.nguyen@technova.com", "Linh Nguyen", "DOMAIN_EXPERT", passwordHash, null, null);
        seedMember(EXPERT_MARCUS_VANCE_ID, "marcus.vance@technova.com", "Marcus Vance", "DOMAIN_EXPERT", passwordHash, null, null);
        seedMember(EMPLOYEE_ACCOUNT_ID, "employee@technova.com", "Alex Chen", "EMPLOYEE", passwordHash, TECHNOVA_DEPT_ID, TECHNOVA_OCC_REF_ID);

        // 5. Organization Registration (Satisfies organization_workspace foreign key)
        jdbc.update("""
                INSERT INTO platform.organization_registration(
                    registration_id, account_id, organization_name, workspace_slug,
                    admin_name, state, email_verified_at, completed_at, created_at, updated_at
                ) VALUES (
                    ?, ?, 'TechNova Cognitive Labs', 'technova',
                    'Elena Rostova', 'REGISTERED', now(), now(), now(), now()
                ) ON CONFLICT (registration_id) DO NOTHING
                """, TECHNOVA_REGISTRATION_ID, ADMIN_ACCOUNT_ID);

        // 4. Organization Workspace (Marked as READY)
        jdbc.update("""
                INSERT INTO platform.organization_workspace(
                    workspace_id, organization_id, registration_id, slug, setup_state, created_at, ready_at
                ) VALUES (
                    ?, ?, ?, 'technova', 'READY', now(), now()
                ) ON CONFLICT (organization_id) DO UPDATE SET setup_state = 'READY', ready_at = coalesce(EXCLUDED.ready_at, now())
                """, TECHNOVA_WORKSPACE_ID, TECHNOVA_ORG_ID, TECHNOVA_REGISTRATION_ID);

        // 5. Subscription Intent & Paid Payment Order
        jdbc.update("""
                INSERT INTO platform.subscription_intent(
                    intent_id, kind, state, registration_id, owner_account_id, applied_order_id, created_at, updated_at
                ) VALUES (
                    ?, 'PURCHASE', 'OPEN', ?, ?, NULL, now(), now()
                ) ON CONFLICT (intent_id) DO NOTHING
                """, TECHNOVA_INTENT_ID, TECHNOVA_REGISTRATION_ID, ADMIN_ACCOUNT_ID);

        jdbc.update("""
                INSERT INTO platform.payment_order(
                    order_id, intent_id, created_by, attempt, plan_id, plan_version_id,
                    name, description, price_vnd, currency, duration_months, employee_seats,
                    idempotency_key, request_digest, payment_status, observed_paid_amount, paid_at,
                    created_at, expires_at
                ) VALUES (
                    ?, ?, ?, 1, ?, ?,
                    'Enterprise Plan', 'Enterprise Plan Bootstrap', 24500000, 'VND', 12, 200,
                    ?, '0000000000000000000000000000000000000000000000000000000000000000', 'PAID', 24500000, now(),
                    now(), now() + interval '30 minutes'
                ) ON CONFLICT (order_id) DO NOTHING
                """, TECHNOVA_ORDER_ID, TECHNOVA_INTENT_ID, ADMIN_ACCOUNT_ID, PLAN_ENTERPRISE_ID, PLAN_ENTERPRISE_VERSION_ID, TECHNOVA_IDEMPOTENCY_KEY);

        jdbc.update("""
                UPDATE platform.subscription_intent
                SET state = 'APPLIED', applied_order_id = ?
                WHERE intent_id = ?
                """, TECHNOVA_ORDER_ID, TECHNOVA_INTENT_ID);

        // 6. Subscription & Subscription Period (Active for 365 days)
        jdbc.update("""
                INSERT INTO platform.subscription(subscription_id, organization_id, created_at)
                VALUES (?, ?, now())
                ON CONFLICT (organization_id) DO NOTHING
                """, TECHNOVA_SUB_ID, TECHNOVA_ORG_ID);

        Integer periodCount = jdbc.queryForObject(
                "SELECT count(*) FROM platform.subscription_period WHERE subscription_id = ?",
                Integer.class,
                TECHNOVA_SUB_ID);
        if (periodCount == null || periodCount == 0) {
            Instant start = Instant.now().minus(30, ChronoUnit.DAYS);
            Instant end = Instant.now().plus(365, ChronoUnit.DAYS);
            jdbc.update("""
                    INSERT INTO platform.subscription_period(
                        period_id, subscription_id, order_id, starts_at, ends_at, billing_zone, anniversary_day, created_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, 'Asia/Ho_Chi_Minh', 1, now()
                    ) ON CONFLICT (period_id) DO NOTHING
                    """, TECHNOVA_PERIOD_ID, TECHNOVA_SUB_ID, TECHNOVA_ORDER_ID, Timestamp.from(start), Timestamp.from(end));
        }

        // 7. Workspace Baseline Resource
        jdbc.update("""
                INSERT INTO platform.workspace_baseline_resource(organization_id, occupation_reference_id, graph_occupation_id)
                VALUES (?, ?, '15-1252.00')
                ON CONFLICT (organization_id, graph_occupation_id) DO NOTHING
                """, TECHNOVA_ORG_ID, TECHNOVA_OCC_REF_ID);
    }

    private void seedMember(UUID accountId, String email, String fullName, String role, String passwordHash,
                            UUID departmentId, UUID occupationRefId) {
        String normalized = email.toLowerCase().trim();

        // Account
        jdbc.update("""
                INSERT INTO platform.account(account_id, organization_id, identifier, normalized_identifier, password_hash, active, created_at)
                VALUES (?, ?, ?, ?, ?, true, now())
                ON CONFLICT (account_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = true
                """, accountId, TECHNOVA_ORG_ID, email, normalized, passwordHash);

        // Profile
        jdbc.update("""
                INSERT INTO platform.workspace_account_profile(account_id, full_name, email_verified_at, auth_version, recovery_required)
                VALUES (?, ?, now(), 0, false)
                ON CONFLICT (account_id) DO UPDATE SET full_name = EXCLUDED.full_name, email_verified_at = now()
                """, accountId, fullName);

        // Membership
        UUID membershipId = UUID.nameUUIDFromBytes(("membership:" + accountId).getBytes());
        jdbc.update("""
                INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, active, department_id, occupation_reference_id, created_at, updated_at)
                VALUES (?, ?, ?, true, ?, ?, now(), now())
                ON CONFLICT (account_id) DO UPDATE SET active = true, department_id = EXCLUDED.department_id, occupation_reference_id = EXCLUDED.occupation_reference_id
                """, membershipId, accountId, TECHNOVA_ORG_ID, departmentId, occupationRefId);

        // Single Role
        jdbc.update("""
                INSERT INTO platform.organization_membership_role(membership_id, role_code)
                VALUES (?, ?)
                ON CONFLICT (membership_id) DO UPDATE SET role_code = EXCLUDED.role_code
                """, membershipId, role);
    }

    private void seedNeo4j() {
        Driver driver = driverProvider.getIfAvailable();
        if (driver == null) return;
        try (var session = driver.session()) {
            session.executeWrite(tx -> {
                // Align target roles for TechNova organization and assign Dr. Sarah Chen
                tx.run("""
                    MATCH (r:TargetRole)
                    WHERE r.organizationId IS NULL OR r.organizationId = 'comp-technova'
                    SET r.organizationId = $orgId
                    """, Map.of("orgId", TECHNOVA_ORG_ID.toString())).consume();

                tx.run("""
                    MATCH (r:TargetRole)
                    WHERE r.organizationId = $orgId
                    SET r.assignedExpertId = $expertId,
                        r.assignedExpertName = 'Dr. Sarah Chen'
                    """, Map.of(
                        "orgId", TECHNOVA_ORG_ID.toString(),
                        "expertId", EXPERT_ACCOUNT_ID.toString()
                    )).consume();

                return true;
            });
            log.info("Neo4j target roles aligned to organization {} and assigned expert {}", TECHNOVA_ORG_ID, EXPERT_ACCOUNT_ID);
        } catch (Exception e) {
            log.warn("Neo4j alignment note: {}", e.getMessage());
        }
    }
}
