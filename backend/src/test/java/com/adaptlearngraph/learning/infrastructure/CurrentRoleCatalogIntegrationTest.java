package com.adaptlearngraph.learning.infrastructure;
import static org.assertj.core.api.Assertions.*;
import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.neo4j.driver.*;
import org.testcontainers.containers.Neo4jContainer;
/** RB02/04/08/17: real Neo4j F15-v1, owned disposable container, no development graph. */
class CurrentRoleCatalogIntegrationTest {
 static final UUID ORG=new UUID(0,1),FOREIGN=new UUID(0,2);
 static final Neo4jContainer<?> GRAPH=new Neo4jContainer<>("neo4j:5.26-community").withAdminPassword("test-fixture-neo4j");
 static Driver driver; CurrentRoleCatalog catalog;
 @BeforeAll static void start(){GRAPH.start();driver=GraphDatabase.driver(GRAPH.getBoltUrl(),AuthTokens.basic("neo4j","test-fixture-neo4j"));}
 @AfterAll static void stop(){if(driver!=null)driver.close();GRAPH.stop();}
 @BeforeEach void fixture(){
  try(var session=driver.session()){
   session.run("MATCH (n) DETACH DELETE n").consume();
   session.run("CREATE (:Occupation {id:'occ-a',code:'O',name:'Occupation A',version:'fixture-v1',status:'ACTIVE',organizationId:$org})",Map.of("org",ORG.toString())).consume();
   for(int r=0;r<3;r++){
    String role="role-"+r,level="level-"+r;
    session.run("""
      MATCH (o:Occupation {id:'occ-a'})
      CREATE (o)-[:HAS_ROLE {id:$membership,version:'fixture-v1',status:'ACTIVE'}]->
      (r:TargetRole {id:$role,code:$role,name:$role,scope:'Scope',version:'fixture-v1',status:'ACTIVE'})
      -[:HAS_LEVEL {id:$edge,version:'fixture-v1',status:'ACTIVE'}]->
      (:Level {id:$level,code:$level,name:'Junior',rank:1,context:'Context',attainmentRule:'ALL',version:'fixture-v1',status:'ACTIVE'})
      """,Map.of("role",role,"level",level,"membership","membership-"+r,"edge","level-edge-"+r)).consume();
    for(int i=r*5;i<r*5+5;i++)skill(session,level,"skill-"+i);
    if(r>0)skill(session,level,"skill-0");
   }
   session.run("""
    CREATE (:Occupation {id:'foreign',code:'FOREIGN',name:'Foreign',version:'fixture-v1',status:'ACTIVE',organizationId:$foreign})
      -[:HAS_ROLE {id:'foreign-membership',version:'fixture-v1',status:'ACTIVE'}]->
    (:TargetRole {id:'foreign-role',code:'F',name:'Foreign Role',scope:'Secret',version:'fixture-v1',status:'ACTIVE'})
      -[:HAS_LEVEL {id:'foreign-level-edge',version:'fixture-v1',status:'ACTIVE'}]->
    (:Level {id:'foreign-level',code:'FL',name:'Senior',rank:1,version:'fixture-v1',status:'ACTIVE'})
    """,Map.of("foreign",FOREIGN.toString())).consume();
  }
  catalog=new CurrentRoleCatalog(driver,new ObjectMapper().findAndRegisterModules(),ORG);
 }
 static void skill(Session session,String level,String skill){
  session.run("""
   MATCH (l:Level {id:$level})
   MERGE (s:MicroSkill {id:$skill}) ON CREATE SET s.code=$skill,s.name=$skill,s.version='fixture-v1',s.status='ACTIVE'
   CREATE (l)-[:REQUIRES_SKILL {id:$edge,version:'fixture-v1',status:'ACTIVE',requiredScore:0.7,isMandatory:true}]->(s)
   """,Map.of("level",level,"skill",skill,"edge",level+"-"+skill)).consume();
 }
 String snapshot(){
  try(var s=driver.session()){
   var nodes=s.run("MATCH (n) RETURN labels(n) AS labels,properties(n) AS p ORDER BY n.id").list(r->r.asMap()).toString();
   var edges=s.run("MATCH (a)-[r]->(b) RETURN a.id AS a,type(r) AS t,properties(r) AS p,b.id AS b ORDER BY r.id").list(r->r.asMap()).toString();
   return RoleBaselineFlow.hash(nodes+edges);
  }
 }
 @Test void rb02And08FullUnionStringIdsAndLevelFields(){
  var roles=catalog.roles(ORG);assertThat(roles).hasSize(3);
  assertThat(roles).extracting(RoleBaselineFlow.Role::id).containsExactly("role-0","role-1","role-2");
  var skills=roles.stream().flatMap(r->r.levels().stream()).flatMap(l->l.skills().stream()).map(RoleBaselineFlow.Skill::id).collect(java.util.stream.Collectors.toSet());
  assertThat(skills).hasSize(15);
  roles.forEach(r->{assertThat(r.occupationId()).isEqualTo("occ-a");assertThat(r.fingerprint()).isNotBlank();assertThat(r.levels().getFirst().context()).isEqualTo("Context");});
 }
 @Test void rb04ForeignOrganizationDeniedBeforeDataAndForeignNodesExcluded(){
  assertThat(catalog.roles(ORG)).noneMatch(r->r.id().equals("foreign-role"));
  assertThatThrownBy(()->catalog.roles(FOREIGN)).isInstanceOfSatisfying(RoleBaselineFlow.Failure.class,e->assertThat(e.status).isEqualTo(403));
 }
 @Test void rb08AmbiguousOwnershipFailsClosed(){
  try(var s=driver.session()){s.run("MATCH (r:TargetRole {id:'role-0'}) CREATE (:Occupation {id:'duplicate-owner',name:'Other',status:'ACTIVE',version:'fixture-v1'})-[:HAS_ROLE {id:'bad-owner',status:'ACTIVE',version:'fixture-v1'}]->(r)").consume();}
  assertThatThrownBy(()->catalog.roles(ORG)).isInstanceOf(IllegalStateException.class);
 }
 @Test void rb17RepeatedReadsDoNotWriteCatalog(){
  var before=snapshot();assertThat(catalog.roles(ORG)).hasSize(3);catalog.roles(ORG);assertThat(snapshot()).isEqualTo(before);
 }
}
