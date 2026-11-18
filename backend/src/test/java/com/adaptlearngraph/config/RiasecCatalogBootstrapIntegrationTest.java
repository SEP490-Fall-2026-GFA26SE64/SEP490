package com.adaptlearngraph.config;

import com.adaptlearngraph.support.Neo4jTestContext;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.Neo4jContainer;
import static org.junit.jupiter.api.Assertions.*;

class RiasecCatalogBootstrapIntegrationTest {
    @Test void currentDeploymentCatalogBootstrapsAndRerunsWithoutChangingExistingProfiles() throws Exception {
        try (var container = new Neo4jContainer<>("neo4j:5.26-community")
                .withEnv("NEO4J_server_memory_heap_initial__size", "64m")
                .withEnv("NEO4J_server_memory_heap_max__size", "256m")
                .withEnv("NEO4J_server_memory_pagecache_size", "64m")
                .withEnv("NEO4J_server_jvm_additional", "-XX:ActiveProcessorCount=2")) {
            container.start();
            try (var context = Neo4jTestContext.start(container.getBoltUrl(), "neo4j", container.getAdminPassword())) {
                var graph = context.cypher();
                var current = LocalCatalogBootstrap.withSoftwareDevelopment(RiasecCatalogReleaseTest.current());
                current.bootstrap(graph);
                current.verifySealed(graph);
                current.bootstrap(graph);
                assertEquals(1018, graph.<Integer>read(tx -> tx.single("MATCH (n) RETURN count(n) AS n").get("n").asInt()));
                assertEquals(4758, graph.<Integer>read(tx -> tx.single("MATCH ()-[r]->() RETURN count(r) AS n").get("n").asInt()));
                assertEquals(20, graph.<Integer>read(tx -> tx.single(
                        "MATCH (p:JobPosition {code:'15-1252.00'}) RETURN p.interestRealistic AS n").get("n").asInt()));

                // The preceding supported release must not overwrite an already imported current profile.
                var previous = LocalCatalogBootstrap.withSoftwareDevelopment(RiasecCatalogReleaseTest.predecessor());
                assertThrows(IllegalStateException.class, () -> previous.bootstrap(graph));
                current.verifySealed(graph);
                assertEquals(20, graph.<Integer>read(tx -> tx.single(
                        "MATCH (p:JobPosition {code:'15-1252.00'}) RETURN p.interestRealistic AS n").get("n").asInt()));
            }
        }
    }
}
