package com.adaptlearngraph.competency.infrastructure;

import com.adaptlearngraph.competency.application.port.out.MacroCompetencyRepository;
import com.adaptlearngraph.competency.domain.MacroCompetency;
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
    public List<MacroCompetency> findAll() {
        String cypher = """
                MATCH (m:MacroCompetency)
                RETURN m
                ORDER BY m.code ASC
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher);
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
                Instant createdAt = node.containsKey("createdAt") && !node.get("createdAt").isNull()
                        ? node.get("createdAt").asZonedDateTime().toInstant()
                        : Instant.now();
                Instant updatedAt = node.containsKey("updatedAt") && !node.get("updatedAt").isNull()
                        ? node.get("updatedAt").asZonedDateTime().toInstant()
                        : Instant.now();
                list.add(new MacroCompetency(id, code, name, desc, status, createdAt, updatedAt));
            }
            return list;
        }
    }
}
