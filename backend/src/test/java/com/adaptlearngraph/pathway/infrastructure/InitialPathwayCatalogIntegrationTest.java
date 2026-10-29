package com.adaptlearngraph.pathway.infrastructure;

import static org.assertj.core.api.Assertions.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.Limits;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.neo4j.driver.*;
import org.testcontainers.containers.Neo4jContainer;

/** Actual driver/Cypher adapter; hand-authored catalog, no shared graph or development seed. */
class InitialPathwayCatalogIntegrationTest {
    static final Neo4jContainer<?> GRAPH=new Neo4jContainer<>("neo4j:5.26-community");
    static final UUID ORG=new UUID(0,101);
    static final Scope SCOPE=new Scope(ORG,new UUID(0,102));
    static final Binding BINDING=new Binding("choice-test","role-test","level-test","occupation-test","Test Role","Test Level","catalog-test","release-test",
            Map.of("catalog","v1","binding","v1","publication","v1","requirements","v1","compatibility","v1"),List.of());
    static final Limits LIMITS=new Limits("test-limits",20,20,20,10,10000);
    static Driver driver;
    static Neo4jInitialGraph adapter;
    @BeforeAll static void setup(){GRAPH.start();driver=GraphDatabase.driver(GRAPH.getBoltUrl(),AuthTokens.basic("neo4j",GRAPH.getAdminPassword()));
        adapter=new Neo4jInitialGraph((scope,reference)->driver.session());
        try(var session=driver.session()){session.executeWrite(tx->{
            tx.run("""
                CREATE (s:MicroSkill {id:'S'}),(p:MicroSkill {id:'P'}),(q:MicroSkill {id:'Q'})
                CREATE (s)-[:HAS_SKILL_PREREQUISITE {id:'edge-SP',requiredScore:0.7}]->(p)
                CREATE (p)-[:HAS_SKILL_PREREQUISITE {id:'edge-PQ',requiredScore:0.6}]->(q)
                CREATE (m:LearningModule {id:'M-A',title:'Hand authored',contentVersion:'content-1',duration:30,price:100})
                CREATE (m)-[:TEACHES {id:'teaches-S',teachingFocus:'PRIMARY',difficultyLevel:'MEDIUM'}]->(s)
                CREATE (m)-[:TEACHES {id:'teaches-P',teachingFocus:'SUPPORTING',difficultyLevel:'LOW'}]->(p)
                WITH [s,p,q,m] AS nodes UNWIND nodes AS n
                SET n.status='ACTIVE',n.version='v1',n.organizationId=$org,n.reviewStatus='APPROVED',n.reviewedBy='test-expert',n.reviewedAt='2026-10-29T00:00:00Z'
                """,Map.of("org",ORG.toString())).consume();
            tx.run("MATCH ()-[r]->() SET r.status='ACTIVE',r.version='v1',r.organizationId=$org,r.reviewStatus='APPROVED',r.reviewedBy='test-expert',r.reviewedAt='2026-10-29T00:00:00Z'",Map.of("org",ORG.toString())).consume();return null;});}}
    @AfterAll static void stop(){if(driver!=null)driver.close();if(GRAPH.isRunning())GRAPH.stop();}
    @Test void P07_multihopClosureAndPerPairFocusDifficultyRoundTrip() {
        var graph=adapter.load(SCOPE,BINDING,Set.of("S"),LIMITS);
        assertThat(graph.skillIds()).containsExactlyInAnyOrder("S","P","Q");assertThat(graph.edges()).hasSize(2);
        assertThat(graph.providers()).extracting(p->p.skillId()+":"+p.teachingFocus()+":"+p.difficultyLevel()).containsExactly("P:SUPPORTING:LOW","S:PRIMARY:MEDIUM");
        assertThat(graph.releaseToken()).isEqualTo("release-test");
    }
    @Test void P20_foreignTenantAndClosureBudgetFailClosed() {
        assertThatThrownBy(()->adapter.load(new Scope(new UUID(0,999),SCOPE.learnerId()),BINDING,Set.of("S"),LIMITS)).hasMessage("CATALOG_SCOPE_INVALID");
        assertThatThrownBy(()->adapter.load(SCOPE,BINDING,Set.of("S"),new Limits("small",1,1,1,1,10))).hasMessage("CATALOG_LIMIT");
    }
}
