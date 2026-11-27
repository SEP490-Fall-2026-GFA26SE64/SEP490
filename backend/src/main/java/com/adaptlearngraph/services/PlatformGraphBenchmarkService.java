package com.adaptlearngraph.services;

import com.adaptlearngraph.config.Rq2BenchmarkSeedBootstrap;
import com.adaptlearngraph.dtos.GraphBenchmarkDto.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.neo4j.driver.Record;
import org.neo4j.driver.Result;
import org.neo4j.driver.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.Instant;
import java.util.*;

@Service
public class PlatformGraphBenchmarkService {

    private static final Logger log = LoggerFactory.getLogger(PlatformGraphBenchmarkService.class);

    private static final int FIXED_TEST_RUNS = 1000;
    private static final int FIXED_WARMUP_RUNS = 50;

    private static final String RESEARCH_QUESTION =
            "What is the query latency of deep pathfinding operations in Neo4j (e.g., 3-hop to 5-hop depth) as the number of nodes/edges in the competency ontology scales from 1,000 to 10,000?";

    private final ObjectProvider<Driver> driverProvider;
    private final ObjectMapper objectMapper;
    private volatile Driver benchmarkDriver;

    public PlatformGraphBenchmarkService(ObjectProvider<Driver> driverProvider, ObjectMapper objectMapper) {
        this.driverProvider = driverProvider;
        this.objectMapper = objectMapper;
    }

    private synchronized Driver acquireDriver() {
        if (benchmarkDriver != null) {
            try {
                benchmarkDriver.verifyConnectivity();
                return benchmarkDriver;
            } catch (Exception e) {
                log.info("Dedicated benchmark driver reconnecting: {}", e.getMessage());
                try { benchmarkDriver.close(); } catch (Exception ignored) {}
                benchmarkDriver = null;
            }
        }
        Driver springDriver = driverProvider.getIfAvailable();
        if (springDriver != null) {
            try {
                springDriver.verifyConnectivity();
                return springDriver;
            } catch (Exception e) {
                log.info("Spring driver not available or closed, using dedicated driver: {}", e.getMessage());
            }
        }
        String defaultUri = System.getenv("NEO4J_URI");
        if (defaultUri == null || defaultUri.isBlank()) {
            defaultUri = "bolt://neo4j:7687";
        }
        String user = System.getenv().getOrDefault("NEO4J_USER", "neo4j");
        String pass = System.getenv().getOrDefault("NEO4J_PASSWORD", "local-only-neo4j");

        try {
            benchmarkDriver = GraphDatabase.driver(defaultUri, AuthTokens.basic(user, pass));
            benchmarkDriver.verifyConnectivity();
        } catch (Exception e) {
            log.info("Could not connect to {}: {}. Trying localhost bolt://127.0.0.1:7687", defaultUri, e.getMessage());
            try {
                benchmarkDriver = GraphDatabase.driver("bolt://127.0.0.1:7687", AuthTokens.basic(user, pass));
                benchmarkDriver.verifyConnectivity();
            } catch (Exception ex2) {
                log.error("Failed to establish Neo4j driver on localhost: {}", ex2.getMessage());
            }
        }
        return benchmarkDriver;
    }

    @PreDestroy
    public void cleanup() {
        if (benchmarkDriver != null) {
            try {
                benchmarkDriver.close();
            } catch (Exception ignored) {}
        }
    }

    public OverviewResponse overview() {
        String version = "5.26.31 Community";
        long nodes = 1098;
        long rels = 4486;

        try {
            Driver driver = acquireDriver();
            if (driver != null) {
                try (Session session = driver.session()) {
                    Result verRes = session.run("CALL dbms.components() YIELD versions RETURN versions[0] AS v;");
                    if (verRes.hasNext()) {
                        version = verRes.next().get("v").asString();
                    }
                    Result nodeRes = session.run("MATCH (n) RETURN count(n) AS cnt;");
                    if (nodeRes.hasNext()) {
                        nodes = nodeRes.next().get("cnt").asLong();
                    }
                    Result relRes = session.run("MATCH ()-[r]->() RETURN count(r) AS cnt;");
                    if (relRes.hasNext()) {
                        rels = relRes.next().get("cnt").asLong();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not query live Neo4j during benchmark overview: {}", e.getMessage());
        }

        return new OverviewResponse(
                version,
                nodes,
                rels,
                List.of("1k", "5k", "10k"),
                FIXED_TEST_RUNS,
                FIXED_WARMUP_RUNS,
                true
        );
    }

    private List<Map<String, Object>> generateBalancedPairs(String scale, int fixtureSet, String idPrefix, int expectedNodes) {
        var generatedPairs = new ArrayList<Map<String, Object>>();
        int chains = expectedNodes / 10;
        for (int offset = 0; offset < chains; offset++) {
            int chain = Math.floorMod(offset + 31 * (fixtureSet - 1), chains);
            for (int depth = 3; depth <= 5; depth++) {
                for (int level = depth; level < 10; level++) {
                    String sId = idPrefix + (chain * 10 + level);
                    String tId = idPrefix + (chain * 10 + level - depth);
                    generatedPairs.add(Map.of(
                            "startId", sId,
                            "startName", "Skill " + sId,
                            "startType", "MicroSkill",
                            "targetId", tId,
                            "targetName", "Skill " + tId,
                            "targetType", "MicroSkill",
                            "hops", depth
                    ));
                }
            }
        }
        Collections.shuffle(generatedPairs, new Random(17L + fixtureSet));

        // Exactly 334 (3-hop), 333 (4-hop), 333 (5-hop) = 1,000 total
        var byDepth = new TreeMap<Integer, List<Map<String, Object>>>();
        for (int depth = 3; depth <= 5; depth++) byDepth.put(depth, new ArrayList<>());
        Map<Integer, Integer> targets = Map.of(3, 334, 4, 333, 5, 333);

        var seen = new HashSet<List<String>>();
        for (var pair : generatedPairs) {
            if (byDepth.entrySet().stream().allMatch(e -> e.getValue().size() >= targets.get(e.getKey()))) {
                break;
            }
            int d = ((Number) pair.get("hops")).intValue();
            if (byDepth.get(d).size() >= targets.get(d)) continue;
            String startId = String.valueOf(pair.get("startId"));
            String targetId = String.valueOf(pair.get("targetId"));
            if (!seen.add(List.of(startId, targetId))) continue;
            byDepth.get(d).add(pair);
        }

        var balanced = new ArrayList<Map<String, Object>>(FIXED_TEST_RUNS);
        for (int i = 0; i < 334; i++) {
            for (int d = 3; d <= 5; d++) {
                if (i < byDepth.get(d).size()) {
                    balanced.add(byDepth.get(d).get(i));
                }
            }
        }
        return balanced;
    }

    public List<FixturePreviewItem> getFixturePairs(String scale, int setIndex, int limit) {
        String normalizedScale = scale != null ? scale.toLowerCase(Locale.ROOT) : "1k";
        int expectedNodes = switch (normalizedScale) {
            case "5k" -> 5000;
            case "10k" -> 10000;
            default -> {
                normalizedScale = "1k";
                yield 1000;
            }
        };
        int set = (setIndex == 2 || setIndex == 3) ? setIndex : 1;
        String idPrefix = "RQ2-" + normalizedScale.toUpperCase(Locale.ROOT) + "-";
        List<Map<String, Object>> list = generateBalancedPairs(normalizedScale, set, idPrefix, expectedNodes);
        int cap = limit > 0 ? Math.min(list.size(), limit) : Math.min(list.size(), 100);
        List<FixturePreviewItem> result = new ArrayList<>(cap);
        for (int i = 0; i < cap; i++) {
            Map<String, Object> map = list.get(i);
            int hops = ((Number) map.getOrDefault("hops", 3)).intValue();
            result.add(new FixturePreviewItem(
                    String.valueOf(map.getOrDefault("startId", "")),
                    String.valueOf(map.getOrDefault("startName", "")),
                    String.valueOf(map.getOrDefault("startType", "MicroSkill")),
                    String.valueOf(map.getOrDefault("targetId", "")),
                    String.valueOf(map.getOrDefault("targetName", "")),
                    String.valueOf(map.getOrDefault("targetType", "MicroSkill")),
                    hops
            ));
        }
        return result;
    }

    public BenchmarkResponse runBenchmark(BenchmarkRequest request) {
        String scale = request != null && request.scale() != null ? request.scale().toLowerCase(Locale.ROOT) : "1k";
        int fixtureSet = request != null && request.fixtureSet() != null ? request.fixtureSet() : 1;
        if (fixtureSet < 1 || fixtureSet > 3) {
            fixtureSet = 1;
        }
        // Strictly enforce the research protocol: 50 warm-up runs and 1,000 measured samples
        final int testRuns = FIXED_TEST_RUNS;
        final int warmupRuns = FIXED_WARMUP_RUNS;

        int expectedNodes = switch (scale) {
            case "1k" -> 1000;
            case "5k" -> 5000;
            case "10k" -> 10000;
            default -> throw new IllegalArgumentException("Unsupported RQ2 scale: " + scale);
        };
        String scaleLabel = expectedNodes + " nodes";
        long catalogNodes;
        long catalogRelationships;

        String environmentKey = "RQ2_NEO4J_URI_" + scale.toUpperCase(Locale.ROOT);
        String isolatedUri = System.getenv(environmentKey);
        boolean isIsolatedMode = isolatedUri != null && !isolatedUri.isBlank();

        if (isIsolatedMode && Set.of("1K", "5K", "10K").stream()
                .filter(other -> isolatedUri.equals(System.getenv("RQ2_NEO4J_URI_" + other))).count() != 1) {
            throw new IllegalStateException("RQ2 graph endpoints must be distinct");
        }

        String version = "5.26.31 Community";
        List<Double> timings = new ArrayList<>(testRuns);
        List<PathSample> samples = new ArrayList<>();

        Driver isolatedDriver = null;
        try {
            Driver driver;
            String idPrefix;
            if (isIsolatedMode) {
                isolatedDriver = GraphDatabase.driver(isolatedUri, AuthTokens.basic(
                        System.getenv().getOrDefault("RQ2_NEO4J_USER", "neo4j"),
                        Objects.requireNonNull(System.getenv("RQ2_NEO4J_PASSWORD"), "Missing RQ2_NEO4J_PASSWORD")));
                driver = isolatedDriver;
                idPrefix = "RQ2-";
            } else {
                driver = acquireDriver();
                if (driver == null) {
                    throw new IllegalStateException("Neo4j driver is unavailable.");
                }
                // Self-healing: ensure the partition for this scale is seeded on main DB
                Rq2BenchmarkSeedBootstrap.ensureScaleSeeded(driver, scale, expectedNodes);
                idPrefix = "RQ2-" + scale.toUpperCase(Locale.ROOT) + "-";
            }

            try (Session session = driver.session()) {
                if (isIsolatedMode) {
                    catalogNodes = session.run("MATCH (n) RETURN count(n) AS total").single().get("total").asLong();
                    catalogRelationships = session.run("MATCH ()-[r]->() RETURN count(r) AS total").single().get("total").asLong();
                    if (catalogNodes != expectedNodes) {
                        throw new IllegalStateException("RQ2 expected " + expectedNodes + " nodes but found " + catalogNodes);
                    }
                } else {
                    catalogNodes = session.run(
                            "MATCH (n:MicroSkill) WHERE n.id STARTS WITH $prefix RETURN count(n) AS total",
                            Map.of("prefix", idPrefix)).single().get("total").asLong();
                    catalogRelationships = session.run(
                            "MATCH (s:MicroSkill)-[r:HAS_SKILL_PREREQUISITE]->(t:MicroSkill) WHERE s.id STARTS WITH $prefix RETURN count(r) AS total",
                            Map.of("prefix", idPrefix)).single().get("total").asLong();
                }

                Result verRes = session.run("CALL dbms.components() YIELD versions RETURN versions[0] AS v;");
                if (verRes.hasNext()) {
                    version = verRes.next().get("v").asString();
                }

                String shortestPathCypher = """
                        MATCH (start:MicroSkill {id: $startId}), (target:MicroSkill {id: $targetId})
                        MATCH p = shortestPath((start)-[:HAS_SKILL_PREREQUISITE*1..5]->(target))
                        RETURN p, length(p) AS hops
                        LIMIT 1
                        """;

                List<Map<String, Object>> fixture = generateBalancedPairs(scale, fixtureSet, idPrefix, expectedNodes);
                if (fixture.size() < testRuns) {
                    throw new IllegalStateException("RQ2 requires " + testRuns + " pairs, but generated " + fixture.size());
                }

                // Stage 3: Warm-up Cache (50 runs executed and discarded)
                for (int w = 0; w < warmupRuns; w++) {
                    Map<String, Object> pair = fixture.get(w % fixture.size());
                    Result r = session.run(shortestPathCypher, Map.of(
                            "startId", String.valueOf(pair.get("startId")),
                            "targetId", String.valueOf(pair.get("targetId"))
                    ));
                    r.list(); // discard
                }

                // Stage 4: Benchmark Execution (1,000 measured runs)
                for (int i = 0; i < testRuns; i++) {
                    Map<String, Object> pair = fixture.get(i);
                    String sId = String.valueOf(pair.get("startId"));
                    String tId = String.valueOf(pair.get("targetId"));

                    long startNanos = System.nanoTime();
                    Result result = session.run(shortestPathCypher, Map.of("startId", sId, "targetId", tId));
                    List<Record> records = result.list(); // execute + consume
                    long elapsedNanos = System.nanoTime() - startNanos;

                    double ms = elapsedNanos / 1_000_000.0;

                    if (records.size() != 1 || records.getFirst().get("hops").asInt() != 3 + (i % 3)) {
                        throw new IllegalStateException("RQ2 graph topology mismatch for pair " + sId + " -> " + tId);
                    }
                    timings.add(ms);

                    if (samples.size() < 10) {
                        int hops = records.get(0).get("hops").asInt(3);
                        samples.add(new PathSample(
                                sId,
                                String.valueOf(pair.getOrDefault("startName", sId)),
                                String.valueOf(pair.getOrDefault("startType", "MicroSkill")),
                                tId,
                                String.valueOf(pair.getOrDefault("targetName", tId)),
                                String.valueOf(pair.getOrDefault("targetType", "MicroSkill")),
                                hops,
                                Math.round(ms * 100.0) / 100.0
                        ));
                    }
                }
                log.info("Live Neo4j benchmark completed successfully: scale={}, set={}, runs={}, warmups={}, meanLatency={}",
                        scale, fixtureSet, testRuns, warmupRuns, timings.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
            }
        } catch (Exception e) {
            log.error("Live Neo4j benchmark execution failed: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to execute live Neo4j benchmark query: " + e.getMessage(), e);
        } finally {
            if (isolatedDriver != null) {
                try {
                    isolatedDriver.close();
                } catch (Exception ignored) {}
            }
        }

        // Statistical calculations
        List<Double> sorted = new ArrayList<>(timings);
        Collections.sort(sorted);

        double min = sorted.get(0);
        double max = sorted.get(sorted.size() - 1);
        double sum = 0;
        for (double t : timings) sum += t;
        double mean = sum / timings.size();
        double p50 = (sorted.get((sorted.size() - 1) / 2) + sorted.get(sorted.size() / 2)) / 2;
        int p95Idx = (int) Math.ceil(0.95 * sorted.size()) - 1;
        double p95 = sorted.get(Math.min(sorted.size() - 1, Math.max(0, p95Idx)));

        double varianceSum = 0;
        for (double t : timings) {
            varianceSum += Math.pow(t - mean, 2);
        }
        double stdDev = Math.sqrt(varianceSum / timings.size());

        // Only total wall-clock latency is measured by this runner.
        StepBreakdown stepBreakdown = new StepBreakdown(0, 0, 0, 0, mean);

        // Legacy response fields retained for the existing JSON schema.
        DifferenceBreakdown differenceBreakdown = new DifferenceBreakdown(0, 0, 0, 0, 0, 0, 0);
        List<ScaleComparisonItem> comparisonRows = List.of(new ScaleComparisonItem(
                scale, scaleLabel, Math.toIntExact(catalogNodes), Math.toIntExact(catalogRelationships), mean, p95, 0));
        List<String> defenseArguments = List.of(
                "Measured directed prerequisite queries at 3, 4 and 5 hops on the selected isolated graph.",
                "Latency includes query execution and result consumption through the Neo4j driver.");

        List<Double> recentRuns = timings.stream()
                .limit(30)
                .toList();

        return new BenchmarkResponse(
                RESEARCH_QUESTION,
                scale,
                scaleLabel,
                catalogNodes,
                catalogRelationships,
                version,
                timings.size(),
                warmupRuns,
                Math.round(mean * 100.0) / 100.0,
                Math.round(p95 * 100.0) / 100.0,
                Math.round(p50 * 100.0) / 100.0,
                Math.round(min * 100.0) / 100.0,
                Math.round(max * 100.0) / 100.0,
                Math.round(stdDev * 100.0) / 100.0,
                0,
                stepBreakdown,
                differenceBreakdown,
                samples,
                comparisonRows,
                defenseArguments,
                recentRuns,
                Instant.now().toString()
        );
    }
}
