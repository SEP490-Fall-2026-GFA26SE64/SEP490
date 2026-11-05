package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.Neo4jCypher;
import com.adaptlearngraph.support.Neo4jTestContext;
import java.nio.file.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.Neo4jContainer;
import static org.junit.jupiter.api.Assertions.*;

class SingleSkillCatalogIntegrationTest {
    @Test void forwardReleaseImportsExactFieldsIsIdempotentAndRejectsExtraMappingDrift() throws Exception {
        var source=new LocalCatalogBootstrap(Files.readAllBytes(Path.of("../documents/dataset/import/ontology_seed-v012.json")));
        assertEquals("0.12.0",source.version());assertEquals(LocalCatalogBootstrap.SINGLE_SKILL_HASH,source.sourceHash());
        try(var container=new Neo4jContainer<>("neo4j:5.26-community")
                .withEnv("NEO4J_server_memory_heap_initial__size","64m").withEnv("NEO4J_server_memory_heap_max__size","256m")
                .withEnv("NEO4J_server_memory_pagecache_size","64m").withEnv("NEO4J_server_jvm_additional","-XX:ActiveProcessorCount=2")) {
            container.start();try(var context=Neo4jTestContext.start(container.getBoltUrl(),"neo4j",container.getAdminPassword())) {
                var graph=context.cypher();source.bootstrap(graph);source.verifySealed(graph);source.bootstrap(graph);
                assertEquals(246,graph.<Integer>read(tx->tx.single("MATCH ()-[t:TEACHES]->() RETURN count(t) AS n").get("n").asInt()));
                assertEquals(4703,graph.<Integer>read(tx->tx.single("MATCH ()-[t]->() RETURN count(t) AS n").get("n").asInt()));
                assertEquals(0,graph.<Integer>read(tx->tx.single("MATCH ()-[t:TEACHES]->() WHERE t.teachingFocus IS NOT NULL OR t.difficultyLevel IS NOT NULL RETURN count(t) AS n").get("n").asInt()));
                assertEquals(0,graph.<Integer>read(tx->tx.single("MATCH (n) WHERE n.reviewedBy IS NOT NULL OR n.reviewedAt IS NOT NULL RETURN count(n) AS n").get("n").asInt()));
                var scope=new com.adaptlearngraph.repository.InitialPathwayPorts.Scope(java.util.UUID.randomUUID(),java.util.UUID.randomUUID());
                var binding=new com.adaptlearngraph.repository.InitialPathwayPorts.Binding("business","role","level","job","Role","Level","fingerprint","release",
                        Map.of("catalog","0.12.0","binding","test","publication","local","requirements","test","compatibility","test","suitability","single-skill-v1"),java.util.List.of());
                var loaded=new com.adaptlearngraph.repository.Neo4jInitialGraph((s,r)->graph,true).load(scope,binding,java.util.Set.of("MS-DE01"),
                        new com.adaptlearngraph.repository.InitialPlanningPorts.Limits("test",128,256,2048,32,1000));
                assertFalse(loaded.providers().isEmpty());
                assertTrue(loaded.providers().stream().allMatch(p->p.teachingFocus()==null && p.difficultyLevel()==null));
                graph.autoCommit("MATCH (m:LearningModule)-[:TEACHES]->(s:MicroSkill) MATCH (other:MicroSkill) WHERE other<>s WITH m,other LIMIT 1 CREATE (m)-[:TEACHES {id:'unexpected'}]->(other)");
                assertThrows(IllegalStateException.class,()->source.verifySealed(graph));
            }
        }
    }
    @Test void explicitForwardMigrationBacksUpAndConvertsAnExactOldReviewGraph() throws Exception {
        try(var container=new Neo4jContainer<>("neo4j:5.26-community")
                .withEnv("NEO4J_server_memory_heap_initial__size","64m").withEnv("NEO4J_server_memory_heap_max__size","256m")
                .withEnv("NEO4J_server_memory_pagecache_size","64m").withEnv("NEO4J_server_jvm_additional","-XX:ActiveProcessorCount=2")) {
            container.start();try(var context=Neo4jTestContext.start(container.getBoltUrl(),"neo4j",container.getAdminPassword())) {
                // Seed the exact retained source as isolated fixture data. Legacy bootstrap's unrelated byte pin remains strict.
                var json=new com.fasterxml.jackson.databind.ObjectMapper();
                var retained=json.readTree(Files.readAllBytes(Path.of("../documents/dataset/import/ontology_seed-v011.json")));
                var labels=Map.of("JobPositions","JobPosition","TargetRoles","TargetRole","Levels","Level","Competencies","Competency","MicroSkills","MicroSkill","LearningModules","LearningModule");
                for(var group:labels.entrySet()) {
                    var rows=new java.util.ArrayList<Map<String,Object>>();
                    for(var node:retained.path(group.getKey())) {
                        Map<String,Object> props=json.convertValue(node,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
                        props.keySet().removeAll(java.util.List.of("jobPositionId","targetRoleId","levelId"));props.values().removeIf(java.util.Objects::isNull);rows.add(props);
                    }
                    context.cypher().write(tx->{tx.execute("UNWIND $rows AS props CREATE (n:"+group.getValue()+") SET n=props",Map.of("rows",rows));return true;});
                }
                for(String type:java.util.List.of("HAS_ROLE","HAS_LEVEL","HAS_COMPETENCY","HAS_SKILL","REQUIRES_SKILL","TEACHES","HAS_SKILL_PREREQUISITE")) {
                    var rows=new java.util.ArrayList<Map<String,Object>>();
                    for(var edge:retained.path("relationships")) if(type.equals(edge.path("type").asText())) {
                        Map<String,Object> props=json.convertValue(edge,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
                        props.keySet().removeAll(java.util.List.of("type","fromId","toId"));props.values().removeIf(java.util.Objects::isNull);
                        rows.add(Map.of("from",edge.path("fromId").asText(),"to",edge.path("toId").asText(),"props",props));
                    }
                    context.cypher().write(tx->{tx.execute("UNWIND $rows AS row MATCH (a {id:row.from}),(b {id:row.to}) CREATE (a)-[r:"+type+"]->(b) SET r=row.props",Map.of("rows",rows));return true;});
                }
                Path root=Files.createTempDirectory("single-skill-upgrade-");Path backup=root.resolve("backup");
                var process=new ProcessBuilder("python3",Path.of("../documents/dataset/import/upgrade_neo4j_v012.py").toAbsolutePath().normalize().toString(),
                        "--url",container.getHttpUrl(),"--apply","--backup-dir",backup.toString());
                process.environment().put("NEO4J_PASSWORD",container.getAdminPassword());
                process.redirectErrorStream(true).redirectOutput(root.resolve("upgrade.log").toFile());
                var child=process.start();
                if(!child.waitFor(120,java.util.concurrent.TimeUnit.SECONDS)){child.destroyForcibly();fail("Isolated upgrade timed out");}
                assertEquals(0,child.exitValue(),Files.readString(root.resolve("upgrade.log")));
                assertTrue(Files.isRegularFile(backup.resolve("graph-before.json")));assertTrue(Files.isRegularFile(backup.resolve("graph-after.json")));
                new LocalCatalogBootstrap(Files.readAllBytes(Path.of("../documents/dataset/import/ontology_seed-v012.json"))).verifySealed(context.cypher());
            }
        }
    }

}
