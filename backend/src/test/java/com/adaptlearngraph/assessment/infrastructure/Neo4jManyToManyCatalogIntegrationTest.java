package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.core.type.TypeReference;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.GraphDatabase;
import org.testcontainers.containers.Neo4jContainer;
import static org.junit.jupiter.api.Assertions.*;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

class Neo4jManyToManyCatalogIntegrationTest {
    @Test void persistsEveryFieldAndSupportsBothTeachingDirectionsWithoutWeakeningSnapshotChecks() throws Exception {
        var data = JSON.readTree(Files.readAllBytes(Path.of("../documents/dataset/import/ontology_seed.json")));
        var labels = Map.of("Occupations", "Occupation", "TargetRoles", "TargetRole", "Levels", "Level",
                "Competencies", "Competency", "MicroSkills", "MicroSkill", "LearningModules", "LearningModule");
        try (var neo4j = new Neo4jContainer<>("neo4j:5.26-community")
                .withEnv("NEO4J_server_memory_heap_initial__size", "256m")
                .withEnv("NEO4J_server_memory_heap_max__size", "256m")
                .withEnv("NEO4J_server_memory_pagecache_size", "128m")) {
            neo4j.start();
            try (var driver = GraphDatabase.driver(neo4j.getBoltUrl(), AuthTokens.basic("neo4j", neo4j.getAdminPassword()));
                    var session = driver.session()) {
                for (var entry : labels.entrySet()) {
                    List<Map<String, Object>> rows = new ArrayList<>();
                    for (var node : data.path(entry.getKey())) {
                        Map<String, Object> props = JSON.convertValue(node, new TypeReference<>() {});
                        props.keySet().removeAll(List.of("occupationId", "targetRoleId", "levelId"));
                        props.values().removeIf(Objects::isNull);
                        rows.add(props);
                    }
                    session.run("UNWIND $rows AS props CREATE (n:" + entry.getValue() + ") SET n=props",
                            Map.of("rows", rows)).consume();
                    var persisted = session.run("MATCH (n:" + entry.getValue() + ") RETURN properties(n) AS props")
                            .list(r -> canonical(JSON.valueToTree(r.get("props").asMap())));
                    assertEquals(rows.stream().map(p -> canonical(JSON.valueToTree(p))).sorted().toList(),
                            persisted.stream().sorted().toList(), "All non-null architecture fields must round-trip");
                }
                for (String type : List.of("HAS_ROLE", "HAS_LEVEL", "HAS_COMPETENCY", "HAS_SKILL",
                        "REQUIRES_SKILL", "TEACHES", "HAS_SKILL_PREREQUISITE")) {
                    List<Map<String, Object>> rows = new ArrayList<>();
                    for (var edge : data.path("relationships")) {
                        if (!type.equals(edge.path("type").asText())) continue;
                        Map<String, Object> props = JSON.convertValue(edge, new TypeReference<>() {});
                        props.keySet().removeAll(List.of("type", "fromId", "toId"));
                        props.values().removeIf(Objects::isNull);
                        rows.add(Map.of("from", edge.path("fromId").asText(), "to", edge.path("toId").asText(), "props", props));
                    }
                    session.run("UNWIND $rows AS row MATCH (a {id:row.from}),(b {id:row.to}) "
                            + "CREATE (a)-[r:" + type + "]->(b) SET r=row.props", Map.of("rows", rows)).consume();
                    var observed = session.run("MATCH (a)-[r:" + type + "]->(b) "
                            + "RETURN a.id AS from,b.id AS to,properties(r) AS props").list(r -> canonical(JSON.valueToTree(r.asMap())));
                    assertEquals(rows.stream().map(p -> canonical(JSON.valueToTree(p))).sorted().toList(),
                            observed.stream().sorted().toList(), "All relationship endpoints and fields must round-trip");
                }
                assertEquals(833, session.run("MATCH (n) RETURN count(n) AS c").single().get("c").asInt());
                assertEquals(4638, session.run("MATCH ()-[r]->() RETURN count(r) AS c").single().get("c").asInt());
                assertTrue(session.run("MATCH (m:LearningModule)-[:TEACHES]->(s:MicroSkill) "
                        + "WITH m,count(s) AS c WHERE c>1 RETURN count(m)>0 AS found").single().get("found").asBoolean());
                assertTrue(session.run("MATCH (m:LearningModule)-[:TEACHES]->(s:MicroSkill) "
                        + "WITH s,count(m) AS c WHERE c>1 RETURN count(s)>0 AS found").single().get("found").asBoolean());
                assertEquals(0, session.run("MATCH (m:LearningModule) WHERE NOT (m)-[:TEACHES]->() RETURN count(m) AS c")
                        .single().get("c").asInt());
                assertEquals(0, session.run("MATCH (s:MicroSkill) WHERE NOT ()-[:TEACHES]->(s) RETURN count(s) AS c")
                        .single().get("c").asInt());
                var scope = parse(Files.readAllBytes(Path.of(
                        "../documents/dataset/question-bank/15-1212.00/catalog-scope-v09.json")), OfficialQuestionBankCatalog.Scope.class);
                var catalog = new OfficialQuestionBankCatalog();
                catalog.verify(driver, "neo4j", scope);
                session.run("MATCH (m:LearningModule)-[r:TEACHES]->(s:MicroSkill) WHERE s.id IN $ids "
                        + "WITH m,r,s LIMIT 1 CREATE (m)-[extra:TEACHES]->(s) SET extra=properties(r),extra.id='drift'",
                        Map.of("ids", scope.skills().keySet().stream().toList())).consume();
                assertThrows(IllegalStateException.class, () -> catalog.verify(driver, "neo4j", scope));
            }
        }
    }
}
