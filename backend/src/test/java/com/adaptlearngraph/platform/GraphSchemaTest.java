package com.adaptlearngraph.platform;

import com.adaptlearngraph.catalog.infrastructure.GraphSchemaMigrator;
import com.adaptlearngraph.catalog.infrastructure.DevelopmentCatalogSeeder;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.GraphDatabase;
import org.neo4j.driver.exceptions.ClientException;
import org.testcontainers.containers.Neo4jContainer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GraphSchemaTest {
    @Test
    void createsCatalogConstraintsAndRejectsDuplicateKeys() throws Exception {
        try (var neo4j = new Neo4jContainer<>("neo4j:5.26-community")) {
            neo4j.start();
            try (var driver = GraphDatabase.driver(neo4j.getBoltUrl(),
                    AuthTokens.basic("neo4j", neo4j.getAdminPassword()))) {
                var migrator = new GraphSchemaMigrator(driver);
                migrator.migrate();
                migrator.migrate();
                var seeder = new DevelopmentCatalogSeeder(driver);
                seeder.seed();
                seeder.seed();
                try (var session = driver.session()) {
                    assertEquals(16, session.run("SHOW CONSTRAINTS YIELD name RETURN count(*) AS count").single()
                            .get("count").asInt());
                    assertEquals(3, session.run("MATCH (migration:SchemaMigration) RETURN count(migration) AS count")
                            .single().get("count").asInt());
                    assertEquals(2, session.run("MATCH (module:LearningModule) RETURN count(module) AS count")
                            .single().get("count").asInt());
                    assertEquals(6, session.run("MATCH (role:TargetRole) RETURN count(role) AS count")
                            .single().get("count").asInt());
                    assertEquals(7, session.run("MATCH ()-[relationship]->() "
                            + "RETURN count(DISTINCT type(relationship)) AS count")
                            .single().get("count").asInt());
                    assertEquals(9, session.run("MATCH (:TargetRole)-[:REQUIRES_SKILL]->(skill:MicroSkill) "
                            + "RETURN count(skill) AS count").single().get("count").asInt());
                    assertEquals(1, session.run("MATCH (:LearningModule)-[:HAS_ENTRY_REQUIREMENT]->(:MicroSkill) "
                            + "RETURN count(*) AS count").single().get("count").asInt());
                    session.run("CREATE (:MicroSkill {id: 'skill-1', code: 'SYNTHETIC_SKILL'})").consume();
                    assertThrows(ClientException.class,
                            () -> session
                                    .run("CREATE (:MicroSkill {id: 'skill-2', code: 'SYNTHETIC_SKILL'})")
                                    .consume());
                    assertThrows(ClientException.class,
                            () -> session.run("CREATE (:MicroSkill {id: 'skill-1', code: 'OTHER_SKILL'})").consume());
                    session.run("CREATE (:TargetRole {id: 'role-1', code: 'SYNTHETIC_SKILL'})").consume();
                    for (String label : java.util.List.of("Occupation", "Level", "Competency", "Course")) {
                        session.run("CREATE (node:" + label + " {id: 'unique-" + label + "'})").consume();
                        assertThrows(ClientException.class,
                                () -> session.run("CREATE (node:" + label + " {id: 'unique-" + label + "'})")
                                        .consume());
                    }
                    session.run("CREATE (:Occupation {id: 'occupation-code-1', code: '15-1252.00'})")
                            .consume();
                    assertThrows(ClientException.class,
                            () -> session.run("CREATE (:Occupation {id: 'occupation-code-2', code: '15-1252.00'})")
                                    .consume());
                    session.run("MATCH (migration:SchemaMigration) SET migration.checksum = 'changed'").consume();
                    assertThrows(IllegalStateException.class, migrator::migrate);
                }
            }
        }
    }
}
