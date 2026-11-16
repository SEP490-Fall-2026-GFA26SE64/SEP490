package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.repository.DevelopmentSeedJpaRepository;
import com.adaptlearngraph.repository.Neo4jCypher;
import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.WorkspaceBaselineResourceJpaRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
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
    public static final UUID DEPT_ENG_COG_ID = UUID.fromString("d0000000-0000-0000-0000-000000000001");
    public static final UUID DEPT_DATA_AI_ID = UUID.fromString("27fd451e-a429-3de1-9a6e-52c5876904a3");
    public static final UUID DEPT_QA_ID = UUID.fromString("4bb9ce13-f65a-349e-803d-017fd495a62f");
    public static final UUID DEPT_CLOUD_ID = UUID.fromString("6fe84095-c4f5-39a2-a100-88a15c672d33");
    public static final UUID DEPT_SEC_ID = UUID.fromString("c05d5732-9897-38c7-9d8f-dfdbe71cfd53");

    public static final UUID TECHNOVA_OCC_REF_ID = UUID.fromString("f0000000-0000-0000-0000-000000000001");
    public static final UUID OCC_REF_DEV_ID = UUID.fromString("f0000000-0000-0000-0000-000000000001");
    public static final UUID OCC_REF_DATA_ID = UUID.fromString("22f79a58-9b62-307a-a099-55559e9684e0");
    public static final UUID OCC_REF_QA_ID = UUID.fromString("d1434cbf-166a-3d18-866c-d681cbd9aea3");
    public static final UUID OCC_REF_CLOUD_ID = UUID.fromString("f6fe81fe-d2c1-3a96-ae98-69a540b5ec22");
    public static final UUID OCC_REF_SEC_ID = UUID.fromString("4b9de1ce-5095-3f1d-b5ba-8b1a26799507");

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
    private final ObjectProvider<Neo4jCypher> graphProvider;
    private final boolean enabled;

    public DevelopmentWorkspaceAccountBootstrap(
            DevelopmentSeedJpaRepository seeds,
            WorkspaceBaselineResourceJpaRepository resources,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,
            RegistrationSecrets secrets,
            ObjectProvider<Neo4jCypher> graphProvider,
            @Value("${workspace.dev-seed.enabled:true}") boolean enabled) {
        this.seeds = seeds;
        this.resources = resources;
        this.transactions = new TransactionTemplate(manager);
        this.secrets = secrets;
        this.graphProvider = graphProvider;
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

        // 2. Department References
        seeds.upsertActiveDepartment(DEPT_ENG_COG_ID, TECHNOVA_ORG_ID, "Engineering & Cognitive Systems");
        seeds.upsertActiveDepartment(DEPT_DATA_AI_ID, TECHNOVA_ORG_ID, "Data & Artificial Intelligence");
        seeds.upsertActiveDepartment(DEPT_QA_ID, TECHNOVA_ORG_ID, "Quality Engineering & Assurance");
        seeds.upsertActiveDepartment(DEPT_CLOUD_ID, TECHNOVA_ORG_ID, "Cloud Infrastructure & DevOps");
        seeds.upsertActiveDepartment(DEPT_SEC_ID, TECHNOVA_ORG_ID, "Cybersecurity & Compliance");

        // 3. JobPosition Department References
        seeds.upsertActiveJobPositionReference(OCC_REF_DEV_ID, TECHNOVA_OCC_ID, TECHNOVA_ORG_ID, DEPT_ENG_COG_ID, "Software Developers");
        seeds.upsertActiveJobPositionReference(OCC_REF_DATA_ID, OCC_REF_DATA_ID, TECHNOVA_ORG_ID, DEPT_DATA_AI_ID, "15-1243.00 - Database Architects");
        seeds.upsertActiveJobPositionReference(OCC_REF_QA_ID, OCC_REF_QA_ID, TECHNOVA_ORG_ID, DEPT_QA_ID, "15-1253.00 - Software Quality Assurance Analysts and Testers");
        seeds.upsertActiveJobPositionReference(OCC_REF_CLOUD_ID, OCC_REF_CLOUD_ID, TECHNOVA_ORG_ID, DEPT_CLOUD_ID, "15-1299.08 - Computer Systems Engineers/Architects");
        seeds.upsertActiveJobPositionReference(OCC_REF_SEC_ID, OCC_REF_SEC_ID, TECHNOVA_ORG_ID, DEPT_SEC_ID, "15-1212.00 - Information Security Analysts");

        // 4. Seed Member Accounts (Admin, Manager, Expert, Employee)
        String passwordHash = secrets.hashPassword(DEFAULT_PASSWORD);
        seedMember(ADMIN_ACCOUNT_ID, "admin@technova.com", "Elena Rostova", "ORGANIZATION_ADMINISTRATOR", passwordHash, DEPT_ENG_COG_ID, OCC_REF_DEV_ID);
        seedMember(MANAGER_ACCOUNT_ID, "manager@technova.com", "Sarah Connor", "LD_MANAGER", passwordHash, DEPT_ENG_COG_ID, OCC_REF_DEV_ID);
        seedMember(EXPERT_ACCOUNT_ID, "expert@technova.com", "Dr. Sarah Chen", "DOMAIN_EXPERT", passwordHash, DEPT_ENG_COG_ID, OCC_REF_DEV_ID);
        seedMember(EXPERT_ALEX_RIVERA_ID, "alex.rivera@technova.com", "Alex Rivera", "DOMAIN_EXPERT", passwordHash, DEPT_SEC_ID, OCC_REF_SEC_ID);
        seedMember(EXPERT_LINH_NGUYEN_ID, "linh.nguyen@technova.com", "Linh Nguyen", "DOMAIN_EXPERT", passwordHash, DEPT_CLOUD_ID, OCC_REF_CLOUD_ID);
        seedMember(EXPERT_MARCUS_VANCE_ID, "marcus.vance@technova.com", "Marcus Vance", "DOMAIN_EXPERT", passwordHash, DEPT_QA_ID, OCC_REF_QA_ID);
        seedMember(EMPLOYEE_ACCOUNT_ID, "employee@technova.com", "Alex Chen", "EMPLOYEE", passwordHash, DEPT_ENG_COG_ID, OCC_REF_DEV_ID);

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
        resources.seedJobPositionIfAbsent(TECHNOVA_ORG_ID, TECHNOVA_OCC_REF_ID, "OCC-15-1252.00");
    }

    private void seedMember(UUID accountId, String email, String fullName, String role, String passwordHash,
                            UUID departmentId, UUID jobPositionRefId) {
        String normalized = email.toLowerCase().trim();

        // Account
        seeds.upsertActiveAccount(accountId, TECHNOVA_ORG_ID, email, normalized, passwordHash);

        // Profile
        seeds.upsertVerifiedProfile(accountId, fullName);

        // Membership
        UUID membershipId = UUID.nameUUIDFromBytes(("membership:" + accountId).getBytes());
        if (departmentId == null && jobPositionRefId == null) {
            seeds.upsertActiveStaffMembership(membershipId, accountId, TECHNOVA_ORG_ID);
        } else {
            seeds.upsertActiveEmployeeMembership(membershipId, accountId, TECHNOVA_ORG_ID, departmentId, jobPositionRefId);
        }

        // Single Role
        seeds.upsertMembershipRole(membershipId, role);
    }
    private void seedNeo4j() {
        Neo4jCypher graph = graphProvider.getIfAvailable();
        if (graph == null) return;
        try {
            graph.write(tx -> {
                String org = TECHNOVA_ORG_ID.toString();

                // 1. Align all catalog nodes for TechNova organization
                tx.execute("""
                    MATCH (n)
                    WHERE (n:JobPosition OR n:TargetRole OR n:Level OR n:Competency OR n:MicroSkill OR n:LearningModule OR n:Department)
                      AND (n.organizationId IS NULL OR n.organizationId = 'comp-technova')
                    SET n.organizationId = $orgId
                    """, Map.of("orgId", org));

                // 2. Ensure all 5 Departments exist as :Department nodes in Neo4j
                tx.execute("""
                    MERGE (d1:Department {organizationId: $orgId, code: 'ENG-COG'})
                    ON CREATE SET d1.id = 'd0000000-0000-0000-0000-000000000001',
                                  d1.name = 'Engineering & Cognitive Systems',
                                  d1.description = 'Core software engineering, cognitive knowledge graphs, and distributed systems.',
                                  d1.headOfDepartment = 'Sarah Connor',
                                  d1.headEmail = 'manager@technova.com',
                                  d1.status = 'ACTIVE',
                                  d1.createdAt = '2026-11-04T00:00:00Z',
                                  d1.updatedAt = '2026-11-04T00:00:00Z'

                    MERGE (d2:Department {organizationId: $orgId, code: 'ENG-DATA'})
                    ON CREATE SET d2.id = '27fd451e-a429-3de1-9a6e-52c5876904a3',
                                  d2.name = 'Data & Artificial Intelligence',
                                  d2.description = 'Data pipelines, analytics warehouses, and cognitive knowledge models.',
                                  d2.headOfDepartment = 'Dr. Sarah Chen',
                                  d2.headEmail = 'expert@technova.com',
                                  d2.status = 'ACTIVE',
                                  d2.createdAt = '2026-11-04T00:00:00Z',
                                  d2.updatedAt = '2026-11-04T00:00:00Z'

                    MERGE (d3:Department {organizationId: $orgId, code: 'ENG-QA'})
                    ON CREATE SET d3.id = '4bb9ce13-f65a-349e-803d-017fd495a62f',
                                  d3.name = 'Quality Engineering & Assurance',
                                  d3.description = 'Automated test suites, Playwright verification, and quality gates.',
                                  d3.headOfDepartment = 'Marcus Vance',
                                  d3.headEmail = 'marcus.vance@technova.com',
                                  d3.status = 'ACTIVE',
                                  d3.createdAt = '2026-11-04T00:00:00Z',
                                  d3.updatedAt = '2026-11-04T00:00:00Z'

                    MERGE (d4:Department {organizationId: $orgId, code: 'ENG-CLOUD'})
                    ON CREATE SET d4.id = '6fe84095-c4f5-39a2-a100-88a15c672d33',
                                  d4.name = 'Cloud Infrastructure & DevOps',
                                  d4.description = 'Cloud systems architecture, container orchestration, and CI/CD pipelines.',
                                  d4.headOfDepartment = 'Linh Nguyen',
                                  d4.headEmail = 'linh.nguyen@technova.com',
                                  d4.status = 'ACTIVE',
                                  d4.createdAt = '2026-11-04T00:00:00Z',
                                  d4.updatedAt = '2026-11-04T00:00:00Z'

                    MERGE (d5:Department {organizationId: $orgId, code: 'ENG-SEC'})
                    ON CREATE SET d5.id = 'c05d5732-9897-38c7-9d8f-dfdbe71cfd53',
                                  d5.name = 'Cybersecurity & Compliance',
                                  d5.description = 'Zero-trust architecture, security auditing, and compliance governance.',
                                  d5.headOfDepartment = 'Alex Rivera',
                                  d5.headEmail = 'alex.rivera@technova.com',
                                  d5.status = 'ACTIVE',
                                  d5.createdAt = '2026-11-04T00:00:00Z',
                                  d5.updatedAt = '2026-11-04T00:00:00Z'
                    """, Map.of("orgId", org));

                // 3. Link each Department to its respective JobPosition
                tx.execute("""
                    MATCH (d:Department {organizationId: $orgId, code: 'ENG-COG'})
                    MATCH (jp:JobPosition) WHERE jp.code = '15-1252.00'
                    MERGE (d)-[:HAS_JOB_POSITION]->(jp)

                    WITH d
                    MATCH (d2:Department {organizationId: $orgId, code: 'ENG-DATA'})
                    MATCH (jp2:JobPosition) WHERE jp2.code = '15-1243.00'
                    MERGE (d2)-[:HAS_JOB_POSITION]->(jp2)

                    WITH d2
                    MATCH (d3:Department {organizationId: $orgId, code: 'ENG-QA'})
                    MATCH (jp3:JobPosition) WHERE jp3.code = '15-1253.00'
                    MERGE (d3)-[:HAS_JOB_POSITION]->(jp3)

                    WITH d3
                    MATCH (d4:Department {organizationId: $orgId, code: 'ENG-CLOUD'})
                    MATCH (jp4:JobPosition) WHERE jp4.code IN ['15-1299.08', '15-1259.00', '15-1260.00']
                    MERGE (d4)-[:HAS_JOB_POSITION]->(jp4)

                    WITH d4
                    MATCH (d5:Department {organizationId: $orgId, code: 'ENG-SEC'})
                    MATCH (jp5:JobPosition) WHERE jp5.code = '15-1212.00'
                    MERGE (d5)-[:HAS_JOB_POSITION]->(jp5)
                    """, Map.of("orgId", org));

                // 4. Assign Subject Matter Experts to Target Roles by Job Position (ONLY for TechNova default org)
                tx.execute("""
                    MATCH (jp:JobPosition {code: '15-1252.00'})-[:HAS_ROLE]->(tr:TargetRole {organizationId: $orgId})
                    SET tr.assignedExpertId = 'a0000000-0000-0000-0000-000000000002',
                        tr.assignedExpertName = 'Dr. Sarah Chen'

                    WITH jp
                    MATCH (jp2:JobPosition {code: '15-1243.00'})-[:HAS_ROLE]->(tr2:TargetRole {organizationId: $orgId})
                    SET tr2.assignedExpertId = 'a0000000-0000-0000-0000-000000000002',
                        tr2.assignedExpertName = 'Dr. Sarah Chen'

                    WITH jp2
                    MATCH (jp3:JobPosition {code: '15-1253.00'})-[:HAS_ROLE]->(tr3:TargetRole {organizationId: $orgId})
                    SET tr3.assignedExpertId = 'a0000000-0000-0000-0000-000000000005',
                        tr3.assignedExpertName = 'Marcus Vance'

                    WITH jp3
                    MATCH (jp4:JobPosition {code: '15-1299.08'})-[:HAS_ROLE]->(tr4:TargetRole {organizationId: $orgId})
                    SET tr4.assignedExpertId = 'a0000000-0000-0000-0000-000000000007',
                        tr4.assignedExpertName = 'Linh Nguyen'

                    WITH jp4
                    MATCH (jp5:JobPosition {code: '15-1212.00'})-[:HAS_ROLE]->(tr5:TargetRole {organizationId: $orgId})
                    SET tr5.assignedExpertId = 'a0000000-0000-0000-0000-000000000006',
                        tr5.assignedExpertName = 'Alex Rivera'
                    """, Map.of("orgId", org));

                // 4.5. Seed complete metadata for all JobPosition nodes in Neo4j
                tx.execute("""
                    MATCH (jp:JobPosition)
                    SET jp.jobZone = coalesce(jp.jobZone, 4)
                    WITH jp
                    MATCH (jp1:JobPosition {code: '15-1252.00'})
                    SET jp1.description = 'Research, design, and develop computer and network software, clean hexagonal microservices, and distributed systems.'
                    WITH jp1
                    MATCH (jp2:JobPosition {code: '15-1243.00'})
                    SET jp2.description = 'Design enterprise data models, transactional knowledge graphs, graph neural networks, and semantic ontologies.'
                    WITH jp2
                    MATCH (jp3:JobPosition {code: '15-1253.00'})
                    SET jp3.description = 'Develop and execute automated test suites, regression pipelines, and test-driven quality verification systems.'
                    WITH jp3
                    MATCH (jp4:JobPosition {code: '15-1299.08'})
                    SET jp4.description = 'Design systems architecture, distributed multi-cloud orchestration, reliable infrastructure pipelines, and telemetry.'
                    WITH jp4
                    MATCH (jp5:JobPosition {code: '15-1212.00'})
                    SET jp5.description = 'Zero-trust architecture, cryptographic identity models, network boundary security, and threat intelligence operations.'
                    WITH jp5
                    MATCH (jp6:JobPosition {code: '15-1259.00'})
                    SET jp6.description = 'Cloud architecture, distributed microservices, and multi-region deployment infrastructure.',
                        jp6.interestRealistic = 0.48, jp6.interestInvestigative = 0.79, jp6.interestArtistic = 0.15, jp6.interestSocial = 0.19, jp6.interestEnterprising = 0.27, jp6.interestConventional = 0.81
                    WITH jp6
                    MATCH (jp7:JobPosition {code: '15-1260.00'})
                    SET jp7.description = 'Cloud automation, serverless computing, and containerization platforms.',
                        jp7.interestRealistic = 0.5, jp7.interestInvestigative = 0.7, jp7.interestArtistic = 0.15, jp7.interestSocial = 0.2, jp7.interestEnterprising = 0.3, jp7.interestConventional = 0.8
                    """, Map.of());

                // 5. Ensure all :Level nodes have default duration set according to rank
                tx.execute("""
                    MATCH (l:Level)
                    SET l.duration = CASE
                        WHEN l.rank = 1 OR l.name = 'Senior' THEN '6 months'
                        WHEN l.rank = 2 OR l.name = 'Middle' THEN '4 months'
                        WHEN l.rank = 3 OR l.name = 'Junior' THEN '3 months'
                        ELSE coalesce(l.duration, '2 months')
                    END
                    """, Map.of());

                // 6. Assign Department and JobPosition to all Competencies via role hierarchy
                tx.execute("""
                    MATCH (d:Department)-[:HAS_JOB_POSITION]->(jp:JobPosition)-[:HAS_ROLE]->(tr:TargetRole)-[:HAS_LEVEL]->(l:Level)-[:HAS_COMPETENCY]->(c:Competency)
                    SET c.departmentId = d.id,
                        c.departmentName = d.name,
                        c.jobPositionCode = jp.code,
                        c.jobPositionTitle = jp.name
                    """, Map.of());

                // Fallback for any competencies not directly reachable via complete role tree
                tx.execute("""
                    MATCH (c:Competency)
                    WHERE c.departmentId IS NULL OR c.departmentId = ''
                    WITH c
                    OPTIONAL MATCH (d_soft:Department {organizationId: c.organizationId}) WHERE d_soft.code = 'ENG-COG' OR d_soft.code = 'DPT-01'
                    OPTIONAL MATCH (jp_dev:JobPosition {organizationId: c.organizationId, code: '15-1252.00'})
                    OPTIONAL MATCH (d_qa:Department {organizationId: c.organizationId}) WHERE d_qa.code = 'ENG-QA' OR (d_qa.code = 'DPT-01' AND NOT EXISTS { MATCH (other:Department {organizationId: c.organizationId, code: 'ENG-QA'}) })
                    OPTIONAL MATCH (jp_qa:JobPosition {organizationId: c.organizationId, code: '15-1253.00'})
                    OPTIONAL MATCH (d_data:Department {organizationId: c.organizationId}) WHERE d_data.code = 'ENG-DATA' OR d_data.code = 'DPT-02'
                    OPTIONAL MATCH (jp_data:JobPosition {organizationId: c.organizationId, code: '15-1243.00'})
                    OPTIONAL MATCH (d_cloud:Department {organizationId: c.organizationId, code: 'ENG-CLOUD'})
                    OPTIONAL MATCH (jp_cloud:JobPosition {organizationId: c.organizationId, code: '15-1299.08'})
                    OPTIONAL MATCH (d_sec:Department {organizationId: c.organizationId, code: 'ENG-SEC'})
                    OPTIONAL MATCH (jp_sec:JobPosition {organizationId: c.organizationId, code: '15-1212.00'})
                    WITH c,
                         coalesce(d_qa, d_soft) AS sel_d_qa, coalesce(jp_qa, jp_dev) AS sel_jp_qa,
                         coalesce(d_data, d_soft) AS sel_d_data, coalesce(jp_data, jp_dev) AS sel_jp_data,
                         coalesce(d_cloud, d_soft) AS sel_d_cloud, coalesce(jp_cloud, jp_dev) AS sel_jp_cloud,
                         coalesce(d_sec, d_soft) AS sel_d_sec, coalesce(jp_sec, jp_dev) AS sel_jp_sec,
                         d_soft AS sel_d_soft, jp_dev AS sel_jp_dev
                    SET c.departmentId = CASE
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'TEXEC' OR toUpper(coalesce(c.code, '')) CONTAINS 'TAUTO' OR toUpper(coalesce(c.code, '')) CONTAINS 'TDES' OR toLower(c.name) CONTAINS 'test' OR toLower(c.name) CONTAINS 'quality' THEN sel_d_qa.id
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DPIPE' OR toUpper(coalesce(c.code, '')) CONTAINS 'DMOD' OR toUpper(coalesce(c.code, '')) CONTAINS 'DQ' OR toUpper(coalesce(c.code, '')) CONTAINS 'DGOV' OR toLower(c.name) CONTAINS 'data' THEN sel_d_data.id
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DELIV' OR toUpper(coalesce(c.code, '')) CONTAINS 'INFRA' OR toUpper(coalesce(c.code, '')) CONTAINS 'OPS' OR toLower(c.name) CONTAINS 'cloud' OR toLower(c.name) CONTAINS 'devops' THEN sel_d_cloud.id
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'SGOV' OR toUpper(coalesce(c.code, '')) CONTAINS 'SEC' OR toLower(c.name) CONTAINS 'security' THEN sel_d_sec.id
                            ELSE sel_d_soft.id
                        END,
                        c.departmentName = CASE
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'TEXEC' OR toUpper(coalesce(c.code, '')) CONTAINS 'TAUTO' OR toUpper(coalesce(c.code, '')) CONTAINS 'TDES' OR toLower(c.name) CONTAINS 'test' OR toLower(c.name) CONTAINS 'quality' THEN sel_d_qa.name
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DPIPE' OR toUpper(coalesce(c.code, '')) CONTAINS 'DMOD' OR toUpper(coalesce(c.code, '')) CONTAINS 'DQ' OR toUpper(coalesce(c.code, '')) CONTAINS 'DGOV' OR toLower(c.name) CONTAINS 'data' THEN sel_d_data.name
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DELIV' OR toUpper(coalesce(c.code, '')) CONTAINS 'INFRA' OR toUpper(coalesce(c.code, '')) CONTAINS 'OPS' OR toLower(c.name) CONTAINS 'cloud' OR toLower(c.name) CONTAINS 'devops' THEN sel_d_cloud.name
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'SGOV' OR toUpper(coalesce(c.code, '')) CONTAINS 'SEC' OR toLower(c.name) CONTAINS 'security' THEN sel_d_sec.name
                            ELSE sel_d_soft.name
                        END,
                        c.jobPositionCode = CASE
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'TEXEC' OR toUpper(coalesce(c.code, '')) CONTAINS 'TAUTO' OR toUpper(coalesce(c.code, '')) CONTAINS 'TDES' OR toLower(c.name) CONTAINS 'test' OR toLower(c.name) CONTAINS 'quality' THEN sel_jp_qa.code
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DPIPE' OR toUpper(coalesce(c.code, '')) CONTAINS 'DMOD' OR toUpper(coalesce(c.code, '')) CONTAINS 'DQ' OR toUpper(coalesce(c.code, '')) CONTAINS 'DGOV' OR toLower(c.name) CONTAINS 'data' THEN sel_jp_data.code
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DELIV' OR toUpper(coalesce(c.code, '')) CONTAINS 'INFRA' OR toUpper(coalesce(c.code, '')) CONTAINS 'OPS' OR toLower(c.name) CONTAINS 'cloud' OR toLower(c.name) CONTAINS 'devops' THEN sel_jp_cloud.code
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'SGOV' OR toUpper(coalesce(c.code, '')) CONTAINS 'SEC' OR toLower(c.name) CONTAINS 'security' THEN sel_jp_sec.code
                            ELSE sel_jp_dev.code
                        END,
                        c.jobPositionTitle = CASE
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'TEXEC' OR toUpper(coalesce(c.code, '')) CONTAINS 'TAUTO' OR toUpper(coalesce(c.code, '')) CONTAINS 'TDES' OR toLower(c.name) CONTAINS 'test' OR toLower(c.name) CONTAINS 'quality' THEN sel_jp_qa.name
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DPIPE' OR toUpper(coalesce(c.code, '')) CONTAINS 'DMOD' OR toUpper(coalesce(c.code, '')) CONTAINS 'DQ' OR toUpper(coalesce(c.code, '')) CONTAINS 'DGOV' OR toLower(c.name) CONTAINS 'data' THEN sel_jp_data.name
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DELIV' OR toUpper(coalesce(c.code, '')) CONTAINS 'INFRA' OR toUpper(coalesce(c.code, '')) CONTAINS 'OPS' OR toLower(c.name) CONTAINS 'cloud' OR toLower(c.name) CONTAINS 'devops' THEN sel_jp_cloud.name
                            WHEN toUpper(coalesce(c.code, '')) CONTAINS 'SGOV' OR toUpper(coalesce(c.code, '')) CONTAINS 'SEC' OR toLower(c.name) CONTAINS 'security' THEN sel_jp_sec.name
                            ELSE sel_jp_dev.name
                        END
                    """, Map.of());

                // 7. Deduplicate duplicate competencies with identical name within each organization
                tx.execute("""
                    MATCH (c:Competency)
                    WITH c.organizationId AS orgId, c.name AS name, collect(c) AS comps
                    WHERE size(comps) > 1
                    WITH orgId, comps[0] AS canonical, comps[1..] AS duplicates
                    UNWIND duplicates AS dup
                    OPTIONAL MATCH (l:Level {organizationId: orgId})-[:HAS_COMPETENCY]->(dup)
                    WITH orgId, canonical, dup, collect(DISTINCT l) AS levels
                    FOREACH (lvl IN levels |
                        MERGE (lvl)-[:HAS_COMPETENCY {id: 'copy-link:' + lvl.id + ':' + canonical.id, organizationId: orgId}]->(canonical)
                    )
                    WITH orgId, canonical, dup
                    OPTIONAL MATCH (dup)-[:HAS_SKILL]->(s:MicroSkill)
                    WITH orgId, canonical, dup, collect(DISTINCT s) AS skills
                    FOREACH (sk IN skills |
                        MERGE (canonical)-[:HAS_SKILL {id: 'copy-link:' + canonical.id + ':' + sk.id, organizationId: orgId}]->(sk)
                    )
                    DETACH DELETE dup
                    """, Map.of());

                // 8. Refresh TargetRole competencyIds with the canonical competency IDs
                tx.execute("""
                    MATCH (tr:TargetRole)-[:HAS_LEVEL]->(lvl:Level)-[:HAS_COMPETENCY]->(c:Competency)
                    WITH tr, collect(DISTINCT c.id) AS canonicalCompIds
                    SET tr.competencyIds = canonicalCompIds
                    """, Map.of());

                return true;
            });
            log.info("Neo4j departments, job positions, and target roles aligned for TechNova organization {}", TECHNOVA_ORG_ID);
        } catch (Exception e) {
            log.warn("Neo4j alignment note: {}", e.getMessage());
        }
    }
}
