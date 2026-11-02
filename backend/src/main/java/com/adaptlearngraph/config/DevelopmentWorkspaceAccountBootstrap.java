package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.repository.DevelopmentSeedJpaRepository;
import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.WorkspaceBaselineResourceJpaRepository;
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
import org.springframework.beans.factory.annotation.Qualifier;
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

    private final DevelopmentSeedJpaRepository seeds;
    private final WorkspaceBaselineResourceJpaRepository resources;
    private final TransactionTemplate transactions;
    private final RegistrationSecrets secrets;
    private final ObjectProvider<Driver> driverProvider;
    private final boolean enabled;

    public DevelopmentWorkspaceAccountBootstrap(
            DevelopmentSeedJpaRepository seeds,
            WorkspaceBaselineResourceJpaRepository resources,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,
            RegistrationSecrets secrets,
            ObjectProvider<Driver> driverProvider,
            @Value("${workspace.dev-seed.enabled:true}") boolean enabled) {
        this.seeds = seeds;
        this.resources = resources;
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
        seeds.upsertActiveOrganization(TECHNOVA_ORG_ID, "TECHNOVA", "TechNova Cognitive Labs");

        // 2. Department Reference
        seeds.upsertActiveDepartment(TECHNOVA_DEPT_ID, TECHNOVA_ORG_ID, "Engineering & Cognitive Systems");

        // 3. Occupation Department Reference
        seeds.upsertActiveOccupationReference(TECHNOVA_OCC_REF_ID, TECHNOVA_OCC_ID, TECHNOVA_ORG_ID, TECHNOVA_DEPT_ID, "Software Developers");

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
        seeds.insertRegistrationNowIfAbsent(TECHNOVA_REGISTRATION_ID, ADMIN_ACCOUNT_ID, "TechNova Cognitive Labs", "technova", "Elena Rostova");

        // 4. Organization Workspace (Marked as READY)
        seeds.upsertReadyWorkspace(TECHNOVA_WORKSPACE_ID, TECHNOVA_ORG_ID, TECHNOVA_REGISTRATION_ID, "technova");

        // 5. Subscription Intent & Paid Payment Order
        seeds.insertPurchaseIntentIfAbsent(TECHNOVA_INTENT_ID, TECHNOVA_REGISTRATION_ID, ADMIN_ACCOUNT_ID);
        seeds.insertPaidBootstrapOrderIfAbsent(TECHNOVA_ORDER_ID, TECHNOVA_INTENT_ID, ADMIN_ACCOUNT_ID, PLAN_ENTERPRISE_ID,
                PLAN_ENTERPRISE_VERSION_ID, TECHNOVA_IDEMPOTENCY_KEY);
        seeds.applyIntent(TECHNOVA_INTENT_ID, TECHNOVA_ORDER_ID);

        // 6. Subscription & Subscription Period (Active for 365 days)
        seeds.insertSubscriptionIfAbsent(TECHNOVA_SUB_ID, TECHNOVA_ORG_ID);

        long periodCount = seeds.periodCount(TECHNOVA_SUB_ID);
        if (periodCount == 0) {
            Instant start = Instant.now().minus(30, ChronoUnit.DAYS);
            Instant end = Instant.now().plus(365, ChronoUnit.DAYS);
            seeds.insertPeriodIfAbsent(TECHNOVA_PERIOD_ID, TECHNOVA_SUB_ID, TECHNOVA_ORDER_ID, start, end);
        }

        // 7. Workspace Baseline Resource
        resources.seedOccupationIfAbsent(TECHNOVA_ORG_ID, TECHNOVA_OCC_REF_ID, "OCC-15-1252.00");
    }

    private void seedMember(UUID accountId, String email, String fullName, String role, String passwordHash,
                            UUID departmentId, UUID occupationRefId) {
        String normalized = email.toLowerCase().trim();

        // Account
        seeds.upsertActiveAccount(accountId, TECHNOVA_ORG_ID, email, normalized, passwordHash);

        // Profile
        seeds.upsertVerifiedProfile(accountId, fullName);

        // Membership
        UUID membershipId = UUID.nameUUIDFromBytes(("membership:" + accountId).getBytes());
        if (departmentId == null && occupationRefId == null) {
            seeds.upsertActiveStaffMembership(membershipId, accountId, TECHNOVA_ORG_ID);
        } else {
            seeds.upsertActiveEmployeeMembership(membershipId, accountId, TECHNOVA_ORG_ID, departmentId, occupationRefId);
        }

        // Single Role
        seeds.upsertMembershipRole(membershipId, role);
    }
    private void seedNeo4j() {
        Driver driver = driverProvider.getIfAvailable();
        if (driver == null) return;
        try (var session = driver.session()) {
            session.executeWrite(tx -> {
                // Align all catalog nodes for TechNova organization and assign Dr. Sarah Chen
                tx.run("""
                    MATCH (n)
                    WHERE (n:Occupation OR n:TargetRole OR n:Level OR n:Competency OR n:MicroSkill OR n:LearningModule)
                      AND (n.organizationId IS NULL OR n.organizationId = 'comp-technova')
                    SET n.organizationId = $orgId
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
