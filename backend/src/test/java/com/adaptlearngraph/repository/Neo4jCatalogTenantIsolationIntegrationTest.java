package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.entities.domain.CompetencyRecord;
import com.adaptlearngraph.entities.domain.LearningModuleRecord;
import com.adaptlearngraph.entities.domain.MicroSkill;
import com.adaptlearngraph.entities.domain.MicroSkillId;
import com.adaptlearngraph.entities.domain.ModuleAuthoring;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Document;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Metadata;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Revision;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Teaching;
import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.RoleTrack;
import com.adaptlearngraph.entities.domain.SkillStatus;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;
import com.adaptlearngraph.exception.CrossTenantWriteException;
import com.adaptlearngraph.services.ModuleAuthoringService;
import com.adaptlearngraph.support.Neo4jTestContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.Neo4jContainer;

/**
 * Spring Data Neo4j catalog adapters against a real Neo4j: writes for organization B that target ids owned by organization
 * A are rejected without touching A's nodes, properties or relationships; relationship writes never connect nodes of
 * different organizations (including module TEACHES edges); list reads issue exactly one Cypher statement regardless of row count.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class Neo4jCatalogTenantIsolationIntegrationTest {
    private static final String A = "org-a";
    private static final String B = "org-b";
    private static final String FIXTURE = """
            CREATE (occ:JobPosition {id: 'occ-a', organizationId: $a, code: 'OCC_A', name: 'JobPosition A', jobZone: 4})
            CREATE (occ2:JobPosition {id: 'occ-a2', organizationId: $a, code: 'OCC_A2', name: 'JobPosition A2', jobZone: 3})
            CREATE (role:TargetRole {id: 'role-a', organizationId: $a, code: 'ROLE_A', baseCode: 'ROLE_A', name: 'Role A',
                                     status: 'ACTIVE', version: '1.0', track: 'PROFESSIONAL'})
            CREATE (role2:TargetRole {id: 'role-a2', organizationId: $a, code: 'ROLE_A2', baseCode: 'ROLE_A2', name: 'Role A2',
                                      status: 'DRAFT', version: '1.0', track: 'PROFESSIONAL'})
            CREATE (level:Level {id: 'level-a', organizationId: $a, code: 'LEVEL_A', name: 'Level A'})
            CREATE (comp:Competency {id: 'comp-a', organizationId: $a, code: 'COMP_A', name: 'Competency A'})
            CREATE (s1:MicroSkill {id: 'skill-a1', organizationId: $a, code: 'SKILL_A1', name: 'Skill A1', status: 'ACTIVE'})
            CREATE (s2:MicroSkill {id: 'skill-a2', organizationId: $a, code: 'SKILL_A2', name: 'Skill A2', status: 'ACTIVE'})
            CREATE (s3:MicroSkill {id: 'skill-a3', organizationId: $a, code: 'SKILL_A3', name: 'Skill A3', status: 'ACTIVE'})
            CREATE (macro:MacroCompetency {id: 'macro-a', organizationId: $a, code: 'KNOWLEDGE', name: 'Knowledge'})
            CREATE (occ)-[:HAS_ROLE]->(role)
            CREATE (role)-[:HAS_LEVEL]->(level)
            CREATE (level)-[:HAS_COMPETENCY {status: 'ACTIVE'}]->(comp)
            CREATE (comp)-[:HAS_SKILL {status: 'ACTIVE'}]->(s1)
            CREATE (level)-[:REQUIRES_SKILL {targetMastery: 0.7}]->(s1)
            CREATE (role)-[:REQUIRES_SKILL {level: '', targetMastery: 0.7, status: 'ACTIVE'}]->(s1)
            CREATE (s1)-[:HAS_SKILL_PREREQUISITE {requiredScore: 0.6, status: 'ACTIVE'}]->(s2)
            CREATE (s2)-[:HAS_SKILL_PREREQUISITE {requiredScore: 0.5, status: 'ACTIVE'}]->(s3)
            CREATE (macro)-[:HAS_SKILL {status: 'ACTIVE'}]->(s1)
            CREATE (module:LearningModule {id: 'module-a', organizationId: $a, title: 'Module A', moduleType: 'LESSON_AND_PRACTICE',
                                           version: '0.11.0', status: 'ACTIVE', reviewStatus: 'APPROVED', duration: 30, price: 1000.0})
            CREATE (module)-[:TEACHES {id: 'teach-a', version: '0.11.0', status: 'ACTIVE', reviewStatus: 'APPROVED',
                                       teachingFocus: 'PRIMARY', difficultyLevel: 'LOW'}]->(s1)
            CREATE (:MicroSkill {id: 'skill-b1', organizationId: $b, code: 'SKILL_B1', name: 'Skill B1', status: 'ACTIVE'})
            CREATE (:Level {id: 'level-b', organizationId: $b, code: 'LEVEL_B', name: 'Level B'})
            """;

    private final Neo4jContainer<?> graph = new Neo4jContainer<>("neo4j:5.26-community");
    private Neo4jTestContext persistence;
    private Neo4jJobPositionRepository jobPositions;
    private Neo4jMicroSkillRepository skills;
    private Neo4jCompetencyRepository competencies;
    private Neo4jTargetRoleRepository roles;
    private Neo4jPrerequisiteRepository prerequisites;
    private Neo4jMacroCompetencyRepository macros;
    private Neo4jLearningModuleRepository modules;
    private Neo4jModuleCatalogGraph moduleGraph;

    @BeforeAll
    void start() {
        graph.start();
        persistence = Neo4jTestContext.start(graph.getBoltUrl(), "neo4j", graph.getAdminPassword());
        var client = persistence.client();
        var mapping = persistence.mappingContext();
        var transactions = persistence.transactionManager();
        jobPositions = new Neo4jJobPositionRepository(persistence.bean(JobPositionNodeRepository.class), client, transactions);
        skills = new Neo4jMicroSkillRepository(persistence.bean(MicroSkillNodeRepository.class), client, mapping, transactions);
        competencies = new Neo4jCompetencyRepository(persistence.bean(CompetencyNodeRepository.class), client, transactions);
        roles = new Neo4jTargetRoleRepository(persistence.bean(TargetRoleNodeRepository.class), client, mapping, transactions);
        prerequisites = new Neo4jPrerequisiteRepository(persistence.bean(MicroSkillNodeRepository.class), client, mapping,
                transactions);
        macros = new Neo4jMacroCompetencyRepository(persistence.bean(MacroCompetencyNodeRepository.class), transactions);
        modules = new Neo4jLearningModuleRepository(persistence.bean(LearningModuleNodeRepository.class), client, transactions);
        moduleGraph = new Neo4jModuleCatalogGraph(persistence.bean(LearningModuleNodeRepository.class), client, transactions);
    }

    @AfterAll
    void stop() {
        if (persistence != null) persistence.close();
        graph.stop();
    }

    @BeforeEach
    void resetGraph() {
        persistence.client().query("MATCH (n) DETACH DELETE n").run();
        persistence.client().query(FIXTURE).bindAll(Map.of("a", A, "b", B)).run();
    }

    @Test
    void writesForOrganizationBOnIdsOwnedByOrganizationAAreRejectedAndLeaveAUntouched() {
        var before = snapshot(A);
        Instant now = Instant.parse("2026-11-03T00:00:00Z");

        assertThatThrownBy(() -> jobPositions.save(B,
                new JobPosition("occ-a", "OCC_B", "Hijacked", 2, 1, 1, 1, 1, 1, 1, "ACTIVE", "1.0", 0, 0)))
                .isInstanceOf(CrossTenantWriteException.class);
        assertThatThrownBy(() -> skills.save(new MicroSkill(MicroSkillId.fromString("skill-a1"), B, "SKILL_A1", "Hijacked",
                "hijacked", "COMMUNICATION", SkillStatus.ACTIVE, now, now)))
                .isInstanceOf(CrossTenantWriteException.class);
        assertThatThrownBy(() -> competencies.save(B, new CompetencyRecord("comp-a", "COMP_A", "Hijacked", "", "ANY", "ACTIVE",
                "0.11.0", null, "", "", List.of()), List.of("skill-b1"), "level-b"))
                .isInstanceOf(CrossTenantWriteException.class);
        assertThatThrownBy(() -> roles.save(new TargetRole(TargetRoleId.fromString("role-a"), B, "ROLE_A", "Hijacked", "FAM",
                RoleTrack.PROFESSIONAL, "", "", List.of(), RoleStatus.ACTIVE, "1.0",
                "[{\"skillCode\":\"SKILL_B1\",\"threshold\":80}]", now, now, null, List.of("Junior"), "{}", List.of())))
                .isInstanceOf(CrossTenantWriteException.class);

        assertThat(snapshot(A)).as("A's nodes, properties and relationships").isEqualTo(before);
        assertThat(ids(B)).containsExactlyInAnyOrder("skill-b1", "level-b");
        assertThat(crossOrganizationRelationships()).isZero();
    }

    @Test
    void relationshipWritesNeverConnectNodesOfDifferentOrganizations() {
        var before = snapshot(A);

        var saved = competencies.save(B, new CompetencyRecord("comp-b", "COMP_B", "Competency B", "", "ANY", "ACTIVE",
                "0.11.0", null, "", "", List.of()), List.of("skill-a1", "SKILL_A2", "skill-b1"), "level-a");
        assertThat(saved.memberSkills()).extracting(CompetencyRecord.MemberSkill::id).containsExactly("skill-b1");
        assertThat(saved.levelId()).as("level of another organization is not linked").isNull();
        assertThat(competencies.save(B, saved, List.of("skill-b1"), "level-b").levelId()).isEqualTo("level-b");

        assertThatThrownBy(() -> prerequisites.savePrerequisite(B, "skill-b1", "skill-a1", 0.6, SkillStatus.ACTIVE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> prerequisites.savePrerequisite(A, "skill-a2", "skill-b1", 0.6, SkillStatus.ACTIVE))
                .isInstanceOf(IllegalArgumentException.class);
        prerequisites.deletePrerequisite(B, "skill-a1", "skill-a2");
        assertThat(prerequisites.hasPath(B, "skill-a1", "skill-a3")).isFalse();
        assertThat(prerequisites.hasPath(A, "skill-a1", "skill-a3")).isTrue();

        roles.save(TargetRole.createNew(B, "ROLE_B", "Role B", "FAM", RoleTrack.PROFESSIONAL, "", "Role B", "1.0",
                RoleStatus.DRAFT, "[{\"skillCode\":\"SKILL_A1\",\"threshold\":70},"
                        + "{\"skillId\":\"skill-a2\",\"skillCode\":\"SKILL_A2\",\"threshold\":70},"
                        + "{\"skillCode\":\"SKILL_B1\",\"threshold\":90}]"));
        assertThat(collectIds("MATCH (r:TargetRole {organizationId: $b})-[:REQUIRES_SKILL]->(s) RETURN collect(s.id) AS ids"))
                .isEqualTo(List.of("skill-b1"));

        skills.save(MicroSkill.createNew(B, "SKILL_B2", "Skill B2", "Second B skill", "KNOWLEDGE"));
        assertThat(collectIds("MATCH (m:MacroCompetency {code: 'KNOWLEDGE'})-[:HAS_SKILL]->(s:MicroSkill {code: 'SKILL_B2'}) "
                + "RETURN collect(m.organizationId) AS ids")).isEqualTo(List.of(B));
        assertThat(macros.findAll(A)).extracting(macro -> macro.id()).containsExactly("macro-a");

        assertThat(snapshot(A)).as("A's nodes, properties and relationships").isEqualTo(before);
        assertThat(crossOrganizationRelationships()).isZero();
        assertThat(prerequisites.findAll(B)).isEmpty();
    }

    @Test
    void moduleGraphWritesForOrganizationBNeverOverwriteOrLinkOrganizationAModules() {
        var before = snapshot(A);

        assertThatThrownBy(() -> modules.save(B, new LearningModuleRecord("module-a", "module-a", "Hijacked", null, null, null,
                null, null, null, null, 15, List.of("skill-b1"), List.of())))
                .isInstanceOf(CrossTenantWriteException.class);
        assertThatThrownBy(() -> moduleGraph.project(moduleDocument("module-a", B, "skill-b1"),
                moduleDocument("module-a", B, "skill-b1").current(), false))
                .isInstanceOf(CrossTenantWriteException.class);
        modules.delete(B, "module-a");
        assertThat(modules.findById(B, "module-a")).isEmpty();
        assertThat(moduleGraph.modules(B)).isEmpty();
        assertThat(snapshot(A)).as("A's module, its properties and TEACHES edges").isEqualTo(before);

        modules.save(B, new LearningModuleRecord("module-b", "module-b", "Module B", null, null, null, null, null, null, null,
                15, List.of("skill-a1", "skill-b1"), List.of()));
        assertThat(modules.findById(B, "module-b").orElseThrow().teachesSkillIds()).containsExactly("skill-b1");

        var crossOrganization = moduleDocument("module-b2", B, "skill-a1");
        assertThatThrownBy(() -> moduleGraph.project(crossOrganization, crossOrganization.current(), false))
                .isInstanceOfSatisfying(ModuleAuthoringService.Failure.class, failure -> assertThat(failure.status()).isEqualTo(409));
        assertThat(collectIds("MATCH (m:LearningModule {id: 'module-b2'}) RETURN collect(m.id) AS ids")).isEmpty();
        var owned = moduleDocument("module-b2", B, "skill-b1");
        moduleGraph.project(owned, owned.current(), false);
        assertThat(collectIds("MATCH (m:LearningModule {id: 'module-b2', organizationId: $b})-[:TEACHES]->(s) RETURN collect(s.id) AS ids"))
                .isEqualTo(List.of("skill-b1"));
        assertThat(moduleGraph.modules(B)).extracting(module -> module.metadata().id()).containsExactly("module-b", "module-b2");

        assertThat(snapshot(A)).as("A's module, its properties and TEACHES edges").isEqualTo(before);
        assertThat(crossOrganizationRelationships()).isZero();
    }

    @Test
    void targetRoleGraphReadsOnlyTheRequestingOrganization() {
        var graphAdapter = new Neo4jTargetRoleGraphAdapter(persistence.client(), persistence.transactionManager());

        var roleGraph = graphAdapter.findTargetRoleGraph(A, "ROLE_A").orElseThrow();
        assertThat(roleGraph.requiredSkills()).extracting(skill -> skill.skillId()).containsExactly("skill-a1");
        assertThat(roleGraph.requiredSkills().getFirst().macroCompetencyCode()).isEqualTo("COMP_A");
        assertThat(roleGraph.prerequisites()).isEmpty();
        assertThat(graphAdapter.findTargetRoleGraph(B, "role-a")).isEmpty();
    }

    @Test
    void listReadsIssueOneCypherStatementRegardlessOfRowCount() {
        var logger = (Logger) LoggerFactory.getLogger("org.springframework.data.neo4j.cypher");
        Level previous = logger.getLevel();
        var appender = new ListAppender<ILoggingEvent>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            assertThat(statements(appender, () -> persistence.client().query("RETURN 1").run()))
                    .as("cypher log events for one statement").hasSize(1);

            assertThat(statements(appender, () -> assertThat(jobPositions.findAllJobPositions(A)).hasSize(2))).hasSize(1);
            assertThat(statements(appender, () -> assertThat(roles.findByOrganizationId(A, TargetRoleFilter.empty())).hasSize(2)))
                    .hasSize(1);
            assertThat(statements(appender, () -> assertThat(skills.findAll(A)).hasSize(3))).hasSize(1);
            assertThat(statements(appender, () -> assertThat(prerequisites.findAll(A)).hasSize(2))).hasSize(1);
            assertThat(statements(appender, () -> assertThat(competencies.findAllCompetencies(A, null)).hasSize(1))).hasSize(1);
            assertThat(statements(appender, () -> assertThat(macros.findAll(A)).hasSize(1))).hasSize(1);
            modules.save(A, new LearningModuleRecord("module-a2", "module-a2", "Module A2", null, null, null, null, null, null,
                    null, 15, List.of("skill-a1", "skill-a2"), List.of()));
            assertThat(statements(appender, () -> assertThat(modules.findAll(A)).hasSize(2))).hasSize(1);
            assertThat(statements(appender, () -> assertThat(moduleGraph.modules(A)).hasSize(2))).hasSize(1);
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(previous);
        }
    }

    private static Document moduleDocument(String id, String organization, String skillId) {
        String at = "2026-11-03T00:00:00Z";
        var teaching = new Teaching(new Metadata(id + "-" + skillId, "0.11.0", "ACTIVE", "APPROVED", "reviewer", at), skillId,
                skillId, "PRIMARY", "LOW");
        var payload = new ModuleAuthoring.Package(new Metadata(id, "0.11.0", "ACTIVE", "APPROVED", "reviewer", at), "Hijacked",
                "LESSON_AND_PRACTICE", "module-content:" + id, "text/markdown", "1.0", 15, new BigDecimal("1000"),
                List.of(teaching), null);
        var revision = new Revision(1, "RELEASED", payload, "expert", at, "reviewer", at, null);
        return new Document(id, organization, List.of(), "expert", at, 1, true, false, 1, List.of(revision), List.of());
    }

    private static List<String> statements(ListAppender<ILoggingEvent> appender, Runnable action) {
        appender.list.clear();
        action.run();
        // Server notifications are logged to child categories (cypher.performance, ...); keep only executed statements.
        return appender.list.stream()
                .filter(event -> event.getLoggerName().equals("org.springframework.data.neo4j.cypher"))
                .map(ILoggingEvent::getFormattedMessage).toList();
    }

    private List<Object> snapshot(String organization) {
        var nodes = persistence.client().query("""
                MATCH (n) WHERE n.organizationId = $organization
                RETURN {labels: labels(n), props: properties(n)} AS row ORDER BY n.id
                """).bind(organization).to("organization").fetchAs(Object.class)
                .mappedBy((types, row) -> row.get("row").asObject()).all();
        var relationships = persistence.client().query("""
                MATCH (x)-[r]->(y) WHERE x.organizationId = $organization OR y.organizationId = $organization
                RETURN {key: x.id + '-' + type(r) + '->' + y.id, props: properties(r)} AS row
                ORDER BY x.id, type(r), y.id
                """).bind(organization).to("organization").fetchAs(Object.class)
                .mappedBy((types, row) -> row.get("row").asObject()).all();
        return Stream.concat(nodes.stream(), relationships.stream()).toList();
    }

    private List<Object> ids(String organization) {
        return collectIds("MATCH (n) WHERE n.organizationId = $" + (organization.equals(A) ? "a" : "b")
                + " RETURN collect(n.id) AS ids");
    }

    @SuppressWarnings("unchecked")
    private List<Object> collectIds(String cypher) {
        return (List<Object>) persistence.client().query(cypher).bindAll(Map.of("a", A, "b", B))
                .fetchAs(Object.class).mappedBy((types, row) -> row.get("ids").asObject()).one().orElseThrow();
    }

    private long crossOrganizationRelationships() {
        return persistence.client().query("""
                MATCH (x)-[r]-(y) WHERE coalesce(x.organizationId, '') <> coalesce(y.organizationId, '') RETURN count(r)
                """).fetchAs(Long.class).one().orElseThrow();
    }
}