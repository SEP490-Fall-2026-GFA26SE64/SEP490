package com.adaptlearngraph.platform;

import com.adaptlearngraph.catalog.infrastructure.GraphSchemaMigrator;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.GraphDatabase;
import org.neo4j.driver.exceptions.ClientException;
import org.testcontainers.containers.Neo4jContainer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GraphSchemaTest {
    @Test
    void createsCommunitySchemaAndRejectsDuplicateVersions() throws Exception {
        try (var neo4j = new Neo4jContainer<>("neo4j:5.26-community")) {
            neo4j.start();
            try (var driver = GraphDatabase.driver(neo4j.getBoltUrl(),
                    AuthTokens.basic("neo4j", neo4j.getAdminPassword()))) {
                var migrator = new GraphSchemaMigrator(driver);
                migrator.migrate();
                migrator.migrate();
                try (var session = driver.session()) {
                    assertEquals(11, session.run("SHOW CONSTRAINTS YIELD name RETURN count(*) AS count").single()
                            .get("count").asInt());
                    assertEquals(1, session.run("MATCH (migration:SchemaMigration) RETURN count(migration) AS count")
                            .single().get("count").asInt());
                    session.run("CREATE (:MicroSkill {skillId: 'synthetic-skill', versionId: 'version-1'})").consume();
                    assertThrows(ClientException.class,
                            () -> session
                                    .run("CREATE (:MicroSkill {skillId: 'synthetic-skill', versionId: 'version-1'})")
                                    .consume());
                    session.run("CREATE (:MicroSkill {skillId: 'synthetic-skill', versionId: 'version-2'})").consume();
                    session.run("MATCH (migration:SchemaMigration) SET migration.checksum = 'changed'").consume();
                    assertThrows(IllegalStateException.class, migrator::migrate);
                }
            }
        }
    }
}