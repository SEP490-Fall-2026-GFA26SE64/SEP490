package com.adaptlearngraph.catalog.infrastructure;

import org.neo4j.driver.Driver;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

public final class GraphSchemaMigrator {
    private final Driver driver;

    public GraphSchemaMigrator(Driver driver) {
        this.driver = driver;
    }

    public void migrate() throws IOException, NoSuchAlgorithmException {
        driver.verifyConnectivity();
        try (var session = driver.session()) {
            session.run(
                    "CREATE CONSTRAINT schema_migration_version IF NOT EXISTS FOR (migration:SchemaMigration) REQUIRE migration.version IS UNIQUE")
                    .consume();
            for (String filename : List.of(
                    "V1__catalog_constraints.cypher",
                    "V2__role_centred_ontology_constraints.cypher",
                    "V3__occupation_constraints.cypher")) {
                String script;
                try (var stream = new ClassPathResource("db/neo4j/" + filename).getInputStream()) {
                    script = new String(stream.readAllBytes(), StandardCharsets.UTF_8).replace("\r\n", "\n");
                }
                String checksum = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                        .digest(script.getBytes(StandardCharsets.UTF_8)));
                var parameters = Map.<String, Object>of("version", filename, "checksum", checksum);
                var applied = session.run(
                        "MATCH (migration:SchemaMigration {version: $version}) RETURN migration.checksum AS checksum",
                        parameters).list();
                if (!applied.isEmpty()) {
                    if (!checksum.equals(applied.getFirst().get("checksum").asString())) {
                        throw new IllegalStateException("Neo4j migration checksum mismatch: " + filename);
                    }
                    continue;
                }
                for (String line : script.lines().filter(value -> !value.isBlank()).toList()) {
                    String statement = line.strip();
                    if (!(statement.startsWith("CREATE CONSTRAINT ") || statement.startsWith("CREATE INDEX "))
                            || !statement.endsWith(";") || statement.indexOf(';') != statement.length() - 1) {
                        throw new IllegalStateException("Expected one schema DDL statement per line: " + filename);
                    }
                    session.run(statement.substring(0, statement.length() - 1)).consume();
                }
                session.run("CALL db.awaitIndexes(120)").consume();
                session.run("CREATE (:SchemaMigration {version: $version, checksum: $checksum, appliedAt: datetime()})",
                        parameters).consume();
            }
        }
    }
}
