package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.MacroCompetency;
import org.neo4j.driver.Driver;
import org.neo4j.driver.types.Node;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class Neo4jMacroCompetencyRepository implements MacroCompetencyRepository {

    private final Driver driver;

    public Neo4jMacroCompetencyRepository(Driver driver) {
        this.driver = driver;
    }

    @Override
    public List<MacroCompetency> findAll(String organizationId) {
        String cypher = """
                MATCH (m:MacroCompetency)
                WHERE m.organizationId = $organizationId
                RETURN m
                ORDER BY m.code ASC
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, java.util.Map.of("organizationId", organizationId));
            List<MacroCompetency> list = new ArrayList<>();
            while (result.hasNext()) {
                Node node = result.next().get("m").asNode();
                String id = node.containsKey("id") && !node.get("id").isNull()
                        ? node.get("id").asString()
                        : java.util.UUID.randomUUID().toString();
                String code = node.get("code").asString();
                String name = node.containsKey("name") && !node.get("name").isNull()
                        ? node.get("name").asString()
                        : code;
                String desc = node.containsKey("description") && !node.get("description").isNull()
                        ? node.get("description").asString()
                        : "";
                String status = node.containsKey("status") && !node.get("status").isNull()
                        ? node.get("status").asString()
                        : "ACTIVE";
                Instant createdAt = Instant.parse("2026-01-01T00:00:00Z");
                if (node.containsKey("createdAt") && !node.get("createdAt").isNull()) {
                    try {
                        createdAt = node.get("createdAt").asZonedDateTime().toInstant();
                    } catch (Exception e1) {
                        try {
                            createdAt = Instant.parse(node.get("createdAt").asString());
                        } catch (Exception ignored) {}
                    }
                }
                Instant updatedAt = createdAt;
                if (node.containsKey("updatedAt") && !node.get("updatedAt").isNull()) {
                    try {
                        updatedAt = node.get("updatedAt").asZonedDateTime().toInstant();
                    } catch (Exception e1) {
                        try {
                            updatedAt = Instant.parse(node.get("updatedAt").asString());
                        } catch (Exception ignored) {}
                    }
                }
                list.add(new MacroCompetency(id, code, name, desc, status, createdAt, updatedAt));
            }
            return list;
        }
    }
}
