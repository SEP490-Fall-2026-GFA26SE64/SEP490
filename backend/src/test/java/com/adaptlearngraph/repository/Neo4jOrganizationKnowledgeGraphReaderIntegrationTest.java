package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.entities.domain.OrganizationKnowledgeGraph;
import com.adaptlearngraph.services.OrganizationKnowledgeGraphService;
import com.adaptlearngraph.support.Neo4jTestContext;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.containers.Neo4jContainer;

/** The administrator knowledge graph returns only ACTIVE catalog nodes/links of the requested organization. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class Neo4jOrganizationKnowledgeGraphReaderIntegrationTest {
    private static final UUID A = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    private static final UUID B = UUID.fromString("b1000000-0000-0000-0000-000000000001");
    private static final String FIXTURE = """
            CREATE (jp:JobPosition {id:'jp', organizationId:$a, code:'JP', name:'Software Engineer', status:'ACTIVE'})
            CREATE (role:TargetRole {id:'role', organizationId:$a, code:'ROLE', name:'Backend', status:'PUBLISHED'})
            CREATE (draft:TargetRole {id:'role-draft', organizationId:$a, code:'DRAFT', name:'Draft role', status:'DRAFT'})
            CREATE (level:Level {id:'level', organizationId:$a, name:'Junior', status:'ACTIVE'})
            CREATE (comp:Competency {id:'comp', organizationId:$a, name:'APIs', status:'ACTIVE'})
            CREATE (s1:MicroSkill {id:'s1', organizationId:$a, code:'S1', name:'REST', description:'Design REST', status:'ACTIVE', reviewStatus:'APPROVED'})
            CREATE (s2:MicroSkill {id:'s2', organizationId:$a, code:'S2', name:'HTTP', status:'ACTIVE', reviewStatus:'NEEDS_EXPERT_REVIEW'})
            CREATE (archived:MicroSkill {id:'s-old', organizationId:$a, name:'Old skill', status:'ARCHIVED'})
            CREATE (module:LearningModule {id:'mod', organizationId:$a, title:'REST basics'})
            CREATE (cert:Certificate {id:'cert', organizationId:$a, name:'REST cert', status:'ACTIVE'})
            CREATE (oldCert:Certificate {id:'cert-old', organizationId:$a, name:'Old cert', status:'ACTIVE'})
            CREATE (dept:Department {id:'dept', organizationId:$a, name:'Engineering', status:'ACTIVE'})
            CREATE (jp)-[:HAS_ROLE {status:'ACTIVE'}]->(role)
            CREATE (jp)-[:HAS_ROLE {status:'ACTIVE'}]->(draft)
            CREATE (role)-[:HAS_LEVEL {status:'ACTIVE'}]->(level)
            CREATE (level)-[:HAS_COMPETENCY {status:'ACTIVE'}]->(comp)
            CREATE (comp)-[:HAS_SKILL {status:'ACTIVE'}]->(s1)
            CREATE (comp)-[:HAS_SKILL {status:'ACTIVE'}]->(archived)
            CREATE (level)-[:REQUIRES_SKILL]->(s1)
            CREATE (s1)-[:HAS_SKILL_PREREQUISITE {status:'ACTIVE'}]->(s2)
            CREATE (s2)-[:HAS_SKILL_PREREQUISITE {status:'ARCHIVED'}]->(s1)
            CREATE (module)-[:TEACHES {status:'ACTIVE'}]->(s1)
            CREATE (s1)-[:REQUIRES_CERTIFICATE {organizationId:$a, status:'ACTIVE'}]->(cert)
            CREATE (s1)-[:REQUIRES_CERTIFICATE {organizationId:$a, status:'INACTIVE'}]->(oldCert)
            CREATE (dept)-[:HAS_JOB_POSITION {status:'ACTIVE'}]->(jp)
            CREATE (other:MicroSkill {id:'b-skill', organizationId:$b, name:'Foreign', status:'ACTIVE'})
            CREATE (:LearningModule {id:'b-mod', organizationId:$b, title:'Foreign module', status:'ACTIVE'})-[:TEACHES {status:'ACTIVE'}]->(other)
            """;

    private final Neo4jContainer<?> graph = new Neo4jContainer<>("neo4j:5.26-community");
    private Neo4jTestContext persistence;
    private OrganizationKnowledgeGraphService service;

    @BeforeAll
    void start() {
        graph.start();
        persistence = Neo4jTestContext.start(graph.getBoltUrl(), "neo4j", graph.getAdminPassword());
        persistence.client().query(FIXTURE).bindAll(Map.of("a", A.toString(), "b", B.toString())).run();
        service = new OrganizationKnowledgeGraphService(
                new Neo4jOrganizationKnowledgeGraphReader(persistence.client(), persistence.transactionManager()));
    }

    @AfterAll
    void stop() {
        if (persistence != null) persistence.close();
        graph.stop();
    }

    @Test
    void returnsOnlyActiveCatalogNodesAndLinksOfTheOrganization() {
        var result = service.graph(A);

        assertThat(result.nodes()).extracting(OrganizationKnowledgeGraph.Node::id)
                .containsExactlyInAnyOrder("jp", "role", "level", "comp", "s1", "s2", "mod", "cert", "cert-old");
        assertThat(result.nodes()).filteredOn(node -> node.id().equals("mod")).singleElement()
                .satisfies(node -> {
                    assertThat(node.label()).isEqualTo("LearningModule");
                    assertThat(node.name()).isEqualTo("REST basics");
                    assertThat(node.status()).isEqualTo("ACTIVE");
                });
        assertThat(result.nodes()).filteredOn(node -> node.id().equals("s1")).singleElement()
                .satisfies(node -> {
                    assertThat(node.code()).isEqualTo("S1");
                    assertThat(node.description()).isEqualTo("Design REST");
                    assertThat(node.reviewStatus()).isEqualTo("APPROVED");
                });
        assertThat(result.nodes()).filteredOn(node -> node.id().equals("level")).singleElement()
                .satisfies(node -> {
                    assertThat(node.code()).isNull();
                    assertThat(node.description()).isNull();
                    assertThat(node.reviewStatus()).isNull();
                });
        assertThat(result.edges()).extracting(OrganizationKnowledgeGraph.Edge::id).containsExactlyInAnyOrder(
                "HAS_ROLE:jp:role", "HAS_LEVEL:role:level", "HAS_COMPETENCY:level:comp", "HAS_SKILL:comp:s1",
                "REQUIRES_SKILL:level:s1", "HAS_SKILL_PREREQUISITE:s1:s2", "TEACHES:mod:s1", "REQUIRES_CERTIFICATE:s1:cert");
    }

    @Test
    void anotherOrganizationSeesOnlyItsOwnGraph() {
        var result = service.graph(B);

        assertThat(result.nodes()).extracting(OrganizationKnowledgeGraph.Node::id).containsExactlyInAnyOrder("b-skill", "b-mod");
        assertThat(result.edges()).extracting(OrganizationKnowledgeGraph.Edge::id).containsExactly("TEACHES:b-mod:b-skill");
        assertThat(service.graph(UUID.randomUUID()).nodes()).isEmpty();
    }
}
