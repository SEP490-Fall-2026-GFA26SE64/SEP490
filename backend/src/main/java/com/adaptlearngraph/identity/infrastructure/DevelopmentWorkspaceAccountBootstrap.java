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
 * and authenticated accounts for Domain Expert, L&D Manager, and Admin.
 */
@Component
@Profile("workspace-baseline & local & !prod")
public final class DevelopmentWorkspaceAccountBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DevelopmentWorkspaceAccountBootstrap.class);

    public static final UUID TECHNOVA_ORG_ID = UUID.fromString("e0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_WORKSPACE_ID = UUID.fromString("e0000000-0000-0000-0000-000000000002");
    public static final UUID TECHNOVA_DEPT_ID = UUID.fromString("d0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_OCC_REF_ID = UUID.fromString("f0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_OCC_ID = UUID.fromString("f0000000-0000-0000-0000-000000000002");
    public static final UUID TECHNOVA_SUB_ID = UUID.fromString("c0000000-0000-0000-0000-000000000001");
    public static final UUID TECHNOVA_PERIOD_ID = UUID.fromString("c0000000-0000-0000-0000-000000000002");

    public static final UUID ADMIN_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000000");
    public static final UUID MANAGER_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    public static final UUID EXPERT_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000002");
    public static final UUID EMPLOYEE_ACCOUNT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000003");

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
            log.warn("Development workspace seed encountered non-fatal notice: {}", ex.getMessage());
        }
    }

    private void seedPostgres() {
        // 1. Organization
        jdbc.update("""
                INSERT INTO platform.organization(organization_id, code, name, status, created_at)
                VALUES (?, 'TECHNOVA', 'TechNova Cognitive Labs', 'ACTIVE', now())
                ON CONFLICT (organization_id) DO UPDATE SET status = 'ACTIVE', name = 'TechNova Cognitive Labs'
                """, TECHNOVA_ORG_ID);

        // 2. Organization Workspace
        jdbc.update("""
                INSERT INTO platform.organization_workspace(workspace_id, organization_id, slug, setup_state, created_at, ready_at)
                VALUES (?, ?, 'technova', 'READY', now(), now())
                ON CONFLICT (organization_id) DO UPDATE SET setup_state = 'READY', ready_at = coalesce(ready_at, now())
                """, TECHNOVA_WORKSPACE_ID, TECHNOVA_ORG_ID);

        // 3. Subscription & Subscription Period (Active: covers current time)
        jdbc.update("""
                INSERT INTO platform.subscription(subscription_id, organization_id, created_at)
                VALUES (?, ?, now())
                ON CONFLICT (organization_id) DO NOTHING
                """, TECHNOVA_SUB_ID, TECHNOVA_ORG_ID);

        Instant start = Instant.now().minus(30, ChronoUnit.DAYS);
        Instant end = Instant.now().plus(365, ChronoUnit.DAYS);
        jdbc.update("""
                INSERT INTO platform.subscription_period(period_id, subscription_id, starts_at, ends_at, billing_zone, anniversary_day, created_at)
                VALUES (?, ?, ?, ?, 'Asia/Ho_Chi_Minh', 1, now())
                ON CONFLICT (period_id) DO NOTHING
                """, TECHNOVA_PERIOD_ID, TECHNOVA_SUB_ID, Timestamp.from(start), Timestamp.from(end));

        // 4. Department Reference
        jdbc.update("""
                INSERT INTO platform.department_reference(department_id, organization_id, name, active)
                VALUES (?, ?, 'Engineering & Cognitive Systems', true)
                ON CONFLICT (department_id) DO UPDATE SET active = true
                """, TECHNOVA_DEPT_ID, TECHNOVA_ORG_ID);

        // 5. Occupation Department Reference
        jdbc.update("""
                INSERT INTO platform.occupation_department_reference(occupation_reference_id, occupation_id, organization_id, department_id, name, active)
                VALUES (?, ?, ?, ?, 'Software Developers', true)
                ON CONFLICT (occupation_reference_id) DO UPDATE SET active = true
                """, TECHNOVA_OCC_REF_ID, TECHNOVA_OCC_ID, TECHNOVA_ORG_ID, TECHNOVA_DEPT_ID);

        // 6. Workspace Baseline Resource
        jdbc.update("""
                INSERT INTO platform.workspace_baseline_resource(organization_id, occupation_reference_id, graph_occupation_id)
                VALUES (?, ?, '15-1252.00')
                ON CONFLICT (organization_id, graph_occupation_id) DO NOTHING
                """, TECHNOVA_ORG_ID, TECHNOVA_OCC_REF_ID);

        // 7. Seed Accounts
        String passwordHash = secrets.hashPassword(DEFAULT_PASSWORD);

        seedMember(MANAGER_ACCOUNT_ID, "manager@technova.com", "Sarah Connor", "LD_MANAGER", passwordHash, null, null);
        seedMember(EXPERT_ACCOUNT_ID, "expert@technova.com", "Dr. Sarah Chen", "DOMAIN_EXPERT", passwordHash, null, null);
        seedMember(EMPLOYEE_ACCOUNT_ID, "employee@technova.com", "Alex Chen", "EMPLOYEE", passwordHash, TECHNOVA_DEPT_ID, TECHNOVA_OCC_REF_ID);
        seedMember(ADMIN_ACCOUNT_ID, "admin@technova.com", "Elena Rostova", "ORGANIZATION_ADMINISTRATOR", passwordHash, null, null);
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

