package com.adaptlearngraph.repository;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Record;
import org.neo4j.driver.Values;
import org.neo4j.driver.internal.InternalRecord;

class PolicyCatalogSnapshotTest {
    final AtomicBoolean transactionOpen=new AtomicBoolean();
    final UUID organization=UUID.fromString("e0000000-0000-0000-0000-000000000001");
    final Neo4jCypher graph=mock(Neo4jCypher.class);
    final Neo4jCypher.Statements statements=mock(Neo4jCypher.Statements.class);
    final ObjectMapper json=new ObjectMapper(){
        @Override public String writeValueAsString(Object value) throws com.fasterxml.jackson.core.JsonProcessingException {
            assertFalse(transactionOpen.get(),"Scope serialization/hashing must not hold the database transaction open");
            return super.writeValueAsString(value);
        }
    };
    @SuppressWarnings("unchecked") PolicyCatalogSnapshotTest() {
        when(graph.read(eq(5),any())).thenAnswer(call->{
            assertFalse(transactionOpen.getAndSet(true));
            try{return ((Function<Neo4jCypher.Statements,Object>)call.getArgument(1)).apply(statements);}
            finally {transactionOpen.set(false);}
        });
    }
    static Record row(Map<String,Object> values) {
        return new InternalRecord(List.copyOf(values.keySet()),values.values().stream().map(Values::value).toList());
    }
    Record skill(String id) {return row(Map.of("skill",Map.of("id",id,"name",id,"version","v1","provisionMode","MODULE_ONLY","reviewStatus","APPROVED")));}
    @Test void fullBaselineCatalogRetainsExactScopeKeysAndHashesAfterSnapshotCloses() throws Exception {
        var roles=new ArrayList<Record>();
        for(int i=0;i<144;i++)roles.add(row(Map.of("role",Map.of("id","role-"+i/3,"name","Role "+i/3,"version","v1","status","ACTIVE"),"levelId","level-"+i,"levelName","Level "+i,"rank",i%3,"skillId","skill","requirement",Map.of("requiredKnowledgeLevels",List.of("FOUNDATION")))));
        when(statements.records(anyString(),anyMap())).thenAnswer(c->{
            assertTrue(transactionOpen.get());assertEquals(organization.toString(),((Map<?,?>)c.getArgument(1)).get("org"));
            String query=c.getArgument(0);return query.contains("AS skill ORDER BY")?List.of(skill("skill")):query.contains("AS requirement")?roles:List.of();
        });
        var discovery=new Neo4jAssessmentPolicyCatalog(graph,json).discover(organization,Purpose.BASELINE);
        assertEquals(192,discovery.scopes().size());assertTrue(discovery.issues().isEmpty());
        var shared=discovery.scopes().stream().filter(AssessmentPolicyScope.Scope::sharedBaseline).toList();
        assertEquals(48,shared.size());
        for(var scope:shared){assertEquals(3,scope.memberLevels().size());assertEquals(1,scope.groups().size());assertEquals(AssessmentPolicyScope.roleKey(scope.ownerId()),scope.key());}
        for(int i=0;i<144;i++) {
            var s=discovery.scopes().get(i);assertTrue(s.ready());assertEquals(1,s.groups().size());
            assertEquals(AssessmentPolicyScope.key(Purpose.BASELINE,"role-"+i/3,"level-"+i),s.key());
            var expected=RoleBaselineFlow.hash(new ObjectMapper().writeValueAsString(List.of(Purpose.BASELINE,"role-"+i/3,"Role "+i/3,"level-"+i,"Level "+i,"v1:ACTIVE",s.groups(),new TreeSet<>())));
            assertEquals(expected,s.catalogHash());
        }
        verify(graph).read(eq(5),any());verify(statements,times(3)).records(anyString(),anyMap());
    }
    @Test void skillPrerequisitesAndExpertOwnershipArePreserved() {
        when(statements.records(anyString(),anyMap())).thenAnswer(c->{String q=c.getArgument(0);
            if(q.contains("AS skill ORDER BY"))return List.of(skill("a"),skill("b"));
            if(q.contains("RETURN DISTINCT s.id"))return List.of(row(Map.of("id","a")));
            if(q.contains("AS prerequisiteLevel"))return List.of(row(Map.of("skill","a","level","FOUNDATION","prerequisite","b","prerequisiteLevel","FOUNDATION")));
            return List.of();});
        var scopes=new Neo4jAssessmentPolicyCatalog(graph,json).discoverForEditor(organization,Purpose.SKILL_ASSESSMENT,UUID.randomUUID()).scopes();
        assertEquals(3,scopes.size());assertTrue(scopes.stream().allMatch(s->s.ownerId().equals("a")));
        assertEquals(2,scopes.stream().filter(s->s.levelId().equals("FOUNDATION")).findFirst().orElseThrow().groups().size());
    }
    @Test void oversizedReadStillFailsBeforeAdditionalQueriesOrHashing() {
        when(statements.records(anyString(),anyMap())).thenReturn(Collections.nCopies(10001,skill("a")));
        var e=assertThrows(com.adaptlearngraph.services.AssessmentPolicyService.Failure.class,()->new Neo4jAssessmentPolicyCatalog(graph,json).discover(organization,Purpose.BASELINE));
        assertEquals("CATALOG_CAPACITY_EXCEEDED",e.code);verify(statements).records(anyString(),anyMap());assertFalse(transactionOpen.get());
    }
    @Test void typedRecordsUseTheExistingBoundedReadTransactionWithoutMappedQueryConversion() {
        var client=mock(org.springframework.data.neo4j.core.Neo4jClient.class);
        var manager=mock(org.springframework.transaction.PlatformTransactionManager.class);
        var runner=mock(org.neo4j.driver.QueryRunner.class);var result=mock(org.neo4j.driver.Result.class);
        var status=new org.springframework.transaction.support.SimpleTransactionStatus();
        var active=new AtomicBoolean();
        when(manager.getTransaction(any())).thenAnswer(c->{
            org.springframework.transaction.TransactionDefinition definition=c.getArgument(0);
            assertTrue(definition.isReadOnly());assertEquals(5,definition.getTimeout());active.set(true);return status;
        });
        when(client.getQueryRunner()).thenAnswer(c->{assertTrue(active.get());return runner;});
        when(runner.run(anyString(),anyMap())).thenReturn(result);
        var expected=List.of(row(Map.of("value","owned")));when(result.list()).thenReturn(expected);
        doAnswer(c->{active.set(false);return null;}).when(manager).commit(status);
        assertEquals(expected,new Neo4jCypher(client,manager).read(5,tx->tx.records("RETURN $value AS value",Map.of("value","owned"))));
        assertFalse(active.get());verify(manager).commit(status);verify(client,never()).query(anyString());
        verify(runner).run("RETURN $value AS value",Map.of("value","owned"));
    }

}
