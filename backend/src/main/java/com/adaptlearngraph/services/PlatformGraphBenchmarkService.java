package com.adaptlearngraph.services;

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
                100,
                50,
                true
        );
    }

    private List<Map<String, Object>> loadTestFixture(String scale, int setIndex) {
        String baseScale = scale != null ? scale.toLowerCase() : "1k";
        if (!baseScale.equals("5k") && !baseScale.equals("10k")) {
            baseScale = "1k";
        }
        int set = (setIndex == 2 || setIndex == 3) ? setIndex : 1;
        String filename = "test_pairs_" + baseScale + "_set" + set + ".json";

        try (InputStream is = getClass().getResourceAsStream("/fixtures/" + filename)) {
            if (is != null) {
                return objectMapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read fixture {}: {}", filename, e.getMessage());
        }

        // Try without _set1 suffix if needed
        String altFilename = "test_pairs_" + baseScale + ".json";
        try (InputStream is = getClass().getResourceAsStream("/fixtures/" + altFilename)) {
            if (is != null) {
                return objectMapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to read alternate fixture {}: {}", altFilename, e.getMessage());
        }

        // Fallback synthetic fixture
        List<Map<String, Object>> fallback = new ArrayList<>();
        fallback.add(Map.of("startId", "MS-FS16", "targetId", "MS-CORE01", "hops", 3,
                "startName", "Configure continuous integration", "targetName", "Implement programs and scripts"));
        fallback.add(Map.of("startId", "3b2debdb-42a5-3ff1-95ad-5e631784e578", "targetId", "707fc861-8fdf-35bd-acb4-c4745e1775a1", "hops", 3,
                "startName", "Configure continuous integration", "targetName", "Implement programs and scripts"));
        return fallback;
    }

    public List<FixturePreviewItem> getFixturePairs(String scale, int setIndex, int limit) {
        List<Map<String, Object>> list = loadTestFixture(scale, setIndex);
        int cap = limit > 0 ? Math.min(list.size(), limit) : Math.min(list.size(), 100);
        List<FixturePreviewItem> result = new ArrayList<>(cap);
        for (int i = 0; i < cap; i++) {
            Map<String, Object> map = list.get(i);
            int hops = 3;
            if (map.get("hops") instanceof Number n) {
                hops = n.intValue();
            }
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
        String scale = request != null && request.scale() != null ? request.scale().toLowerCase() : "1k";
        int fixtureSet = request != null && request.fixtureSet() != null ? request.fixtureSet() : 1;
        int testRuns = request != null && request.testRuns() != null ? Math.max(10, Math.min(1000, request.testRuns())) : 100;
        int warmupRuns = request != null && request.warmupRuns() != null ? Math.max(5, Math.min(100, request.warmupRuns())) : 50;

        List<Map<String, Object>> fixture = new ArrayList<>(loadTestFixture(scale, fixtureSet));

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
        String uri = System.getenv(environmentKey);
        if (uri == null || uri.isBlank()) {
            throw new IllegalStateException("Missing isolated graph configuration: " + environmentKey);
        }
        if (Set.of("1K", "5K", "10K").stream()
                .filter(other -> uri.equals(System.getenv("RQ2_NEO4J_URI_" + other))).count() != 1) {
            throw new IllegalStateException("RQ2 graph endpoints must be distinct");
        }

        String version = "5.26.31 Community";
        List<Double> timings = new ArrayList<>();
        List<PathSample> samples = new ArrayList<>();

        // 1. Execute against Neo4j with Pure Latency timing
        try (Driver driver = GraphDatabase.driver(uri, AuthTokens.basic(
                    System.getenv().getOrDefault("RQ2_NEO4J_USER", "neo4j"),
                    Objects.requireNonNull(System.getenv("RQ2_NEO4J_PASSWORD"), "Missing RQ2_NEO4J_PASSWORD")));
             Session session = driver.session()) {
                catalogNodes = session.run("MATCH (n) RETURN count(n) AS total").single().get("total").asLong();
                catalogRelationships = session.run("MATCH ()-[r]->() RETURN count(r) AS total").single().get("total").asLong();
                if (catalogNodes != expectedNodes) {
                    throw new IllegalStateException("RQ2 expected " + expectedNodes + " nodes but found " + catalogNodes);
                }
                Result verRes = session.run("CALL dbms.components() YIELD versions RETURN versions[0] AS v;");
                if (verRes.hasNext()) {
                    version = verRes.next().get("v").asString();
                }

                // Stage 3: Warm-up Cache (runs executed and discarded)
                String shortestPathCypher = """
                        MATCH (start:MicroSkill), (target:MicroSkill)
                        WHERE (start.id = $startId OR start.code = $startId)
                          AND (target.id = $targetId OR target.code = $targetId)
                        MATCH p = shortestPath((start)-[:HAS_SKILL_PREREQUISITE*1..5]->(target))
                        RETURN p, length(p) AS hops
                        LIMIT 1
                        """;

                var byDepth = new TreeMap<Integer, List<Map<String, Object>>>();
                for (int depth = 3; depth <= 5; depth++) byDepth.put(depth, new ArrayList<>());
                // Sample across the pinned synthetic graph with a reproducible order.
                var generatedPairs = new ArrayList<Map<String, Object>>();
                int chains = expectedNodes / 10;
                for (int offset = 0; offset < chains; offset++) {
                    int chain = Math.floorMod(offset + 31 * (fixtureSet - 1), chains);
                    for (int depth = 3; depth <= 5; depth++) {
                        for (int level = depth; level < 10; level++) {
                            generatedPairs.add(Map.of("startId", "RQ2-" + (chain * 10 + level),
                                    "targetId", "RQ2-" + (chain * 10 + level - depth)));
                        }
                    }
                }
                Collections.shuffle(generatedPairs, new Random(17L + fixtureSet));
                fixture.addAll(generatedPairs);
                var seen = new HashSet<List<String>>();
                int requiredPerDepth = (testRuns + 2) / 3;
                for (var pair : fixture) {
                    if (byDepth.values().stream().allMatch(pairs -> pairs.size() >= requiredPerDepth)) break;
                    String startId = String.valueOf(pair.get("startId"));
                    String targetId = String.valueOf(pair.get("targetId"));
                    if (!seen.add(List.of(startId, targetId))) continue;
                    var records = session.run(shortestPathCypher, Map.of("startId", startId, "targetId", targetId)).list();
                    if (records.size() != 1) continue;
                    int depth = records.getFirst().get("hops").asInt();
                    if (byDepth.containsKey(depth)) byDepth.get(depth).add(pair);
                }
                if (byDepth.values().stream().anyMatch(pairs -> pairs.size() < requiredPerDepth)) {
                    throw new IllegalStateException("RQ2 needs " + requiredPerDepth
                            + " distinct directed pairs at each depth 3, 4 and 5");
                }
                var balanced = new ArrayList<Map<String, Object>>(3 * requiredPerDepth);
                for (int i = 0; i < requiredPerDepth; i++) {
                    for (var pairs : byDepth.values()) balanced.add(pairs.get(i));
                }
                fixture = balanced;

                for (int w = 0; w < warmupRuns; w++) {
                    Map<String, Object> pair = fixture.get(w % fixture.size());
                    Result r = session.run(shortestPathCypher, Map.of(
                            "startId", String.valueOf(pair.get("startId")),
                            "targetId", String.valueOf(pair.get("targetId"))
                    ));
                    r.list(); // discard
                }

                // Stage 4: Benchmark Execution
                for (int i = 0; i < testRuns; i++) {
                    Map<String, Object> pair = fixture.get(i % fixture.size());
                    String sId = String.valueOf(pair.get("startId"));
                    String tId = String.valueOf(pair.get("targetId"));

                    long startNanos = System.nanoTime();
                    Result result = session.run(shortestPathCypher, Map.of("startId", sId, "targetId", tId));
                    List<Record> records = result.list(); // execute + consume
                    long elapsedNanos = System.nanoTime() - startNanos;

                    double ms = elapsedNanos / 1_000_000.0;
                    
                    if (records.size() != 1 || records.getFirst().get("hops").asInt() != 3 + i % 3) {
                        throw new IllegalStateException("RQ2 graph changed after fixture validation");
                    }
                    timings.add(ms);

                    if (samples.size() < 10) {
                        int hops = 3;
                        if (!records.isEmpty() && records.get(0).containsKey("hops")) {
                            hops = records.get(0).get("hops").asInt(3);
                        } else if (pair.get("hops") instanceof Number n) {
                            hops = n.intValue();
                        }
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
                log.info("Live Neo4j benchmark completed successfully: scale={}, runs={}, warmups={}, meanLatency={}",
                        scale, testRuns, warmupRuns, timings.stream().mapToDouble(Double::doubleValue).average().orElse(0.0));
        } catch (Exception e) {
            log.error("Live Neo4j benchmark execution failed: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to execute live Neo4j benchmark query: " + e.getMessage(), e);
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
