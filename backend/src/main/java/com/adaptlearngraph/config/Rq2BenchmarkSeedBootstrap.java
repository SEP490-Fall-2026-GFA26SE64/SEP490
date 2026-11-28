package com.adaptlearngraph.config;

import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Idempotent automatic seed bootstrap for Research Question 2 (Graph Latency Benchmark).
 * Runs at application startup during deployment or local dev, provisioning 1k, 5k, and 10k
 * isolated benchmark subgraphs in Neo4j without affecting real business entities.
 */
@Component
@Profile("!migrate")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Order(Ordered.LOWEST_PRECEDENCE)
public class Rq2BenchmarkSeedBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(Rq2BenchmarkSeedBootstrap.class);

    private final ObjectProvider<Driver> driverProvider;
    private final ConfigurableApplicationContext context;

    public Rq2BenchmarkSeedBootstrap(ObjectProvider<Driver> driverProvider, ConfigurableApplicationContext context) {
        this.driverProvider = driverProvider;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!context.isActive()) {
            return;
        }
        try {
            Driver driver = driverProvider.getIfAvailable();
            if (driver == null) {
                log.info("Neo4j driver not available, skipping RQ2 benchmark seed bootstrap.");
                return;
            }
            ensureAllBenchmarkScalesSeeded(driver);
        } catch (Exception e) {
            log.warn("Non-fatal RQ2 benchmark seed bootstrap notice: {}", e.getMessage());
        }
    }

    public static void ensureAllBenchmarkScalesSeeded(Driver driver) {
        ensureScaleSeeded(driver, "1k", 1000);
        ensureScaleSeeded(driver, "5k", 5000);
        ensureScaleSeeded(driver, "10k", 10000);
    }

    public static synchronized void ensureScaleSeeded(Driver driver, String scale, int expectedNodes) {
        String scaleUpper = scale.toUpperCase();
        String prefix = "RQ2-" + scaleUpper + "-";
        // Constant 1% relative graph density across all scales: 1k -> 10, 5k -> 50, 10k -> 100
        int branching = expectedNodes / 100;
        long expectedRels = (long) (expectedNodes * 9 / 10) * branching;
        try (Session session = driver.session()) {
            long currentNodes = session.run(
                    "MATCH (n:MicroSkill) WHERE n.id STARTS WITH $prefix RETURN count(n) AS cnt",
                    Map.of("prefix", prefix)
            ).single().get("cnt").asLong();
            long currentRels = session.run(
                    "MATCH (s:MicroSkill)-[r:HAS_SKILL_PREREQUISITE]->(:MicroSkill) WHERE s.id STARTS WITH $prefix RETURN count(r) AS cnt",
                    Map.of("prefix", prefix)
            ).single().get("cnt").asLong();

            if (currentNodes == expectedNodes && currentRels == expectedRels) {
                return; // Already fully seeded
            }

            if (currentRels > expectedRels) {
                log.info("Resetting RQ2 benchmark relationships for scale {} ({} -> {})...", scale, currentRels, expectedRels);
                long deleted;
                do {
                    deleted = session.run(
                            "MATCH (s:MicroSkill)-[r:HAS_SKILL_PREREQUISITE]->(:MicroSkill) WHERE s.id STARTS WITH $prefix WITH r LIMIT 50000 DELETE r RETURN count(r) AS cnt",
                            Map.of("prefix", prefix)
                    ).single().get("cnt").asLong();
                } while (deleted > 0);
            }

            log.info("Seeding RQ2 benchmark partition for scale {} (target: {} nodes, {} rels)...", scale, expectedNodes, expectedRels);

            session.run("CREATE CONSTRAINT rq2_microskill_id IF NOT EXISTS FOR (n:MicroSkill) REQUIRE n.id IS UNIQUE;");

            if (currentNodes != expectedNodes) {
                // Batch create nodes
                String createNodesCypher = String.format("""
                        UNWIND range(0, %d) AS i
                        MERGE (n:MicroSkill:RQ2Benchmark {id: '%s' + toString(i)})
                        SET n.code = '%s' + toString(i),
                            n.name = 'Benchmark Skill ' + '%s' + toString(i),
                            n.dataset = '%s',
                            n.version = 'rq2-benchmark';
                        """, expectedNodes - 1, prefix, prefix, prefix, scale.toLowerCase());
                session.run(createNodesCypher);
            }

            // Batch create relationships in 1,000-node chunks (10-node chain topology with scale-proportional branching)
            int batchSize = 1000;
            for (int start = 0; start < expectedNodes; start += batchSize) {
                int end = Math.min(expectedNodes - 1, start + batchSize - 1);
                String createRelsCypher = String.format("""
                        UNWIND range(%d, %d) AS i
                        WITH i WHERE i %% 10 > 0
                        UNWIND range(0, %d) AS k
                        MATCH (source:MicroSkill {id: '%s' + toString(i)})
                        MATCH (target:MicroSkill {id: '%s' + toString((i + k * 10) %% %d - 1)})
                        MERGE (source)-[:HAS_SKILL_PREREQUISITE {dataset: '%s'}]->(target);
                        """, start, end, branching - 1, prefix, prefix, expectedNodes, scale.toLowerCase());
                session.run(createRelsCypher);
            }

            log.info("RQ2 benchmark partition for scale {} seeded successfully ({} nodes, {} relationships).",
                    scale, expectedNodes, expectedRels);
        } catch (Exception e) {
            log.error("Failed to seed RQ2 benchmark partition for scale {}: {}", scale, e.getMessage(), e);
            throw new IllegalStateException("Failed to seed RQ2 benchmark partition for " + scale + ": " + e.getMessage(), e);
        }
    }
}
