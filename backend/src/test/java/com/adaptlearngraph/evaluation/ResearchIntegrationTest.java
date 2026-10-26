package com.adaptlearngraph.evaluation;

import com.adaptlearngraph.evaluation.domain.*;
import com.adaptlearngraph.evaluation.domain.Research.*;
import com.adaptlearngraph.evaluation.infrastructure.*;
import com.adaptlearngraph.evaluation.application.ResearchException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.GraphDatabase;
import org.neo4j.driver.AuthTokens;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ResearchIntegrationTest {
    @Test void persistsAllArchitecturalFieldsAndExecutesRealThreeToFiveHopQueries()throws Exception{
        try(var primary=new Neo4jContainer<>("neo4j:5.26-community").withEnv("NEO4J_server_memory_heap_initial__size","256m").withEnv("NEO4J_server_memory_heap_max__size","256m").withEnv("NEO4J_server_memory_pagecache_size","128m");var isolated=new Neo4jContainer<>("neo4j:5.26-community").withEnv("NEO4J_server_memory_heap_initial__size","256m").withEnv("NEO4J_server_memory_heap_max__size","256m").withEnv("NEO4J_server_memory_pagecache_size","128m")) {
            primary.start();isolated.start();
            try(var driver=GraphDatabase.driver(primary.getBoltUrl(),AuthTokens.basic("neo4j",primary.getAdminPassword()));
                var check=GraphDatabase.driver(isolated.getBoltUrl(),AuthTokens.basic("neo4j",isolated.getAdminPassword()));
                var graph=new Neo4jResearchGraph(driver,isolated.getBoltUrl(),"neo4j",isolated.getAdminPassword(),"Testcontainers")) {
                try(var s=driver.session()){s.run("CREATE (:Operational {id:'untouched'})").consume();}
                assertFalse(graph.environment().get("neo4jVersion").isBlank());
                for(int size:List.of(1000,5000,10000)) {
                    Graph data=new OntologyGenerator().generate(ResearchDomainTest.source(),size,42);graph.replace(data);
                    try(var s=check.session()) {
                        Map<String,Map<String,Object>> loaded=new HashMap<>();s.run("MATCH (n:ResearchNode) RETURN n.id AS id, properties(n) AS props").list().forEach(r->loaded.put(r.get("id").asString(),r.get("props").asMap()));
                        assertEquals(size,loaded.size());for(Node node:data.nodes())assertProperties(node.properties(),loaded.get(node.id()));
                        Map<String,Map<String,Object>> edges=new HashMap<>();s.run("MATCH (:ResearchNode)-[r]->(:ResearchNode) RETURN r.id AS id, properties(r) AS props").list().forEach(r->edges.put(r.get("id").asString(),r.get("props").asMap()));
                        assertEquals(data.edges().size(),edges.size());for(Edge edge:data.edges())assertProperties(edge.properties(),edges.get(edge.properties().get("id").toString()));
                    }
                    for(int hop:List.of(3,4,5))for(Workload w:data.workload().stream().filter(w->w.hops()==hop).limit(5).toList()) {
                        Sample sample=graph.measure(0,w);assertEquals(hop,sample.returnedHops());assertTrue(sample.latencyMs()>0);
                    }
                }
                try(var s=driver.session()){assertEquals(1,s.run("MATCH (n:Operational) RETURN count(n) AS n").single().get("n").asInt());}
                try(var same=new Neo4jResearchGraph(driver,primary.getBoltUrl(),"neo4j",primary.getAdminPassword(),"unsafe")){assertThrows(IllegalStateException.class,same::environment);}
                try(var s=check.session()){s.run("CREATE (:ForeignData {id:'foreign'})").consume();}
                assertThrows(IllegalStateException.class,graph::environment);
            }
        }
    }
    private void assertProperties(Map<String,Object> expected,Map<String,Object> actual){
        var nonNull=new HashMap<>(expected);nonNull.values().removeIf(Objects::isNull);assertEquals(nonNull.keySet(),actual.keySet());
        for(var e:nonNull.entrySet())if(e.getValue() instanceof Number n)assertEquals(n.doubleValue(),((Number)actual.get(e.getKey())).doubleValue());else assertEquals(e.getValue(),actual.get(e.getKey()));
    }
    @Test void postgresRetainsFrozenArtifactsRejectsOverlapAndRecoversInterruptedRun()throws Exception{
        try(var postgres=new PostgreSQLContainer<>("postgres:17.6-alpine")) {
            postgres.start();Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).locations("classpath:db/migration").target("27").load().migrate();
            var jdbc=new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()));
            var store=new JdbcResearchStore(jdbc,new ObjectMapper().findAndRegisterModules());
            Graph graph=new OntologyGenerator().generate(ResearchDomainTest.source(),1000,42);
            var run=new Run(UUID.randomUUID(),"admin","QUEUED",Instant.now(),null,42,List.of(1000),graph.sourceHash(),graph.sourceVersion(),"rq2-v1",1000,30,0,"Queued",null,Map.of(),"frozen rules",List.of());
            store.create(run);
            jdbc.update("INSERT INTO platform.research_graph(run_id,node_count,payload) VALUES (?,?,?::jsonb)",run.id(),1000,new ObjectMapper().findAndRegisterModules().writeValueAsString(graph));
            jdbc.update("UPDATE platform.research_run SET payload=payload-'protocol'-'totalQueries'-'planReady' WHERE id=?",run.id());
            Flyway.configure().dataSource(postgres.getJdbcUrl(),postgres.getUsername(),postgres.getPassword()).locations("classpath:db/migration").load().migrate();
            assertEquals(1000,store.get(run.id()).totalQueries());assertNull(store.get(run.id()).protocol());assertEquals(graph,store.graph(run.id(),1000,42));
            var second=new Run(UUID.randomUUID(),"admin","QUEUED",Instant.now(),null,42,List.of(1000),graph.sourceHash(),graph.sourceVersion(),"rq2-v2",37,30,0,"Queued",null,Map.of(),"frozen rules",List.of());
            assertThrows(ResearchException.class,()->store.create(second));store.recoverInterrupted();assertEquals("FAILED",store.get(run.id()).status());assertEquals("frozen rules",store.get(run.id()).rulesMarkdown());store.create(second);assertEquals(37,store.get(second.id()).iterations());assertEquals(2,store.list().size());assertEquals(37,store.list().stream().filter(x->x.id().equals(second.id())).findFirst().orElseThrow().iterations());
            store.recoverInterrupted();
            var study=new Run(UUID.randomUUID(),"admin","RUNNING",Instant.now(),null,1,List.of(1000),graph.sourceHash(),graph.sourceVersion(),"rq2-v3",12,0,0,"Measuring",null,Map.of("query","safe"),"v3 frozen rules",List.of(),new Protocol(List.of(1L,2L),2,2),24,true);
            store.create(study);
            Graph one=new OntologyGenerator().generate(ResearchDomainTest.source(),1000,1,2),two=new OntologyGenerator().generate(ResearchDomainTest.source(),1000,2,2);
            store.saveGraph(study.id(),one);store.saveGraph(study.id(),two);
            assertEquals(one,store.graph(study.id(),1000,1));assertEquals(two,store.graph(study.id(),1000,2));assertEquals(study,store.get(study.id()));
            var metrics=Metrics.of(List.of(new Sample(0,3,"s","m",4,3)));
            var trial=new Trial(1,1,Map.of(3,2,4,2,5,2),6,Structure.of(one),2,1,1);
            var result=new Result(1000,one.edges().size(),one.nodeCounts(),one.edgeCounts(),2,3,metrics,Map.of(3,metrics),List.of(new Sample(0,3,"s","m",4,3),new Sample(1,3,"s","m",10,0,"TIMEOUT","safe error")),trial);
            store.save(study.progress("SUCCEEDED",2,"Completed",null,Map.of("query","safe"),List.of(result)));
            assertEquals(result,store.get(study.id()).results().getFirst());
            Run summary=store.list().stream().filter(x->x.id().equals(study.id())).findFirst().orElseThrow();
            assertEquals(study.protocol(),summary.protocol());assertEquals(24,summary.totalQueries());assertEquals(trial,summary.results().getFirst().trial());assertEquals(4,summary.results().getFirst().overall().medianMs());assertNull(summary.results().getFirst().samples());
        }
    }
}
