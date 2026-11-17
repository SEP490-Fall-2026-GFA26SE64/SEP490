package com.adaptlearngraph.repository;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.neo4j.driver.Record;
import org.neo4j.driver.Result;
import org.neo4j.driver.Session;
import org.neo4j.driver.Values;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * NFR-P02: Graph Query Performance Benchmark
 *
 * Requirement Specification:
 * - Metric: Execution time of selected Role, Skill, Prerequisite, and Pathway catalog queries.
 * - Target SLA: Every selected query runs within 1.0 s (< 1000 ms) after warm-up on the recorded catalog.
 * - Protocol:
 *   1. 4 representative queries (Role, Skill, Prerequisite DAG, Pathway Baseline Catalog).
 *   2. Warm-up: 3 executions per query discarded.
 *   3. Measurement: 10 timed runs per query with fixed parameters on the recorded catalog snapshot.
 *   4. Timing boundary: Measures graph execution including full result set consumption; excludes HTTP/UI transport.
 *   5. Data retention: Retain all 10 timings, calculate Min, Max, Mean, Median (p50), and 95th Percentile (p95).
 * - Responsible: Nguyễn Anh Khôi
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("NFR-P02: Performance — Graph Queries (SLA <= 1.0 s)")
public class GraphQueryPerformanceBenchmarkTest {

    private static final String DEFAULT_ORG = "e0000000-0000-0000-0000-000000000001";
    private static final double SLA_MAX_MS = 1000.0;
    private static final int WARMUP_RUNS = 3;
    private static final int MEASURED_RUNS = 10;

    private Driver driver;
    private String neo4jVersion = "Unknown";
    private long totalNodes = 0;
    private long totalRelationships = 0;
    private final Map<String, Long> nodeCountsByLabel = new LinkedHashMap<>();
    private final Map<String, Long> relCountsByType = new LinkedHashMap<>();

    // 1. Role Query: Target Role hierarchy with levels, competencies, and required micro-skills
    public static final String Q1_ROLE_QUERY = """
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId AND (r.code = $code OR r.baseCode = $code)
            OPTIONAL MATCH (r)-[:HAS_LEVEL]->(l:Level)
            WITH r, l ORDER BY coalesce(l.rank, 999) ASC, l.name ASC
            WITH r, [x IN collect(DISTINCT CASE WHEN l IS NOT NULL THEN l.name END) WHERE x IS NOT NULL] AS graphLevels,
                 [x IN collect(DISTINCT CASE WHEN l IS NOT NULL THEN { name: l.name, duration: coalesce(l.duration, '') } END) WHERE x IS NOT NULL] AS graphLevelDetails
            OPTIONAL MATCH (r)-[:HAS_LEVEL]->(clvl:Level)-[:HAS_COMPETENCY]->(comp:Competency)
            WHERE (comp.organizationId IS NULL OR comp.organizationId = r.organizationId) AND coalesce(comp.status, 'ACTIVE') = 'ACTIVE'
            WITH r, graphLevels, graphLevelDetails,
                 [x IN collect(DISTINCT CASE WHEN comp IS NOT NULL THEN {
                     levelName: clvl.name,
                     competencyId: comp.id,
                     competencyCode: coalesce(comp.code, comp.id)
                 } END) WHERE x IS NOT NULL] AS graphCompetencies
            OPTIONAL MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
            WHERE req.status='ACTIVE' AND (s.organizationId IS NULL OR s.organizationId=r.organizationId) AND s.status='ACTIVE'
            WITH r, graphLevels, graphLevelDetails, graphCompetencies, [x IN collect(DISTINCT CASE WHEN s IS NOT NULL THEN {
                skillId: s.id,
                skillCode: s.code,
                skillName: s.name,
                level: coalesce(req.level, '')
            } END) WHERE x IS NOT NULL] AS directSkills
            OPTIONAL MATCH (r)-[:HAS_LEVEL]->(lvl:Level)-[:HAS_COMPETENCY]->(c:Competency)-[:HAS_SKILL]->(cs:MicroSkill)
            OPTIONAL MATCH (lvl)-[lreq:REQUIRES_SKILL]->(cs)
            WITH r, graphLevels, graphLevelDetails, graphCompetencies, directSkills, [x IN collect(DISTINCT CASE WHEN cs IS NOT NULL THEN {
                skillId: cs.id,
                skillCode: cs.code,
                skillName: cs.name,
                level: coalesce(lreq.level, lvl.name, '')
            } END) WHERE x IS NOT NULL] AS levelSkills
            WITH r, graphLevels, graphLevelDetails, graphCompetencies, CASE WHEN size(directSkills) > 0 THEN directSkills ELSE levelSkills END AS graphSkills
            RETURN r, graphSkills, graphLevels, graphLevelDetails, graphCompetencies
            """;

    // 2. Skill Query: Micro-Skill & Competency taxonomy retrieval with certification prerequisites
    public static final String Q2_SKILL_QUERY = """
            MATCH (c:Competency)-[:HAS_SKILL]->(s:MicroSkill)
            WHERE (c.organizationId IS NULL OR c.organizationId = $organizationId)
              AND (s.organizationId IS NULL OR s.organizationId = $organizationId)
              AND coalesce(c.status, 'ACTIVE') = 'ACTIVE'
              AND coalesce(s.status, 'ACTIVE') = 'ACTIVE'
            OPTIONAL MATCH (s)-[reqCert:REQUIRES_CERTIFICATE]->(cert:Certificate)
            RETURN s.id AS skillId, s.code AS skillCode, s.name AS skillName,
                   c.id AS competencyId, c.name AS competencyName,
                   collect(DISTINCT cert.name) AS certificates
            ORDER BY s.code ASC
            """;

    // 3. Prerequisite Query: Directed skill prerequisite DAG traversal & reachability
    public static final String Q3_PREREQUISITE_QUERY = """
            MATCH (source:MicroSkill)-[rel:HAS_SKILL_PREREQUISITE]->(target:MicroSkill)
            WHERE (source.organizationId IS NULL OR source.organizationId = $organizationId)
              AND (target.organizationId IS NULL OR target.organizationId = $organizationId)
              AND coalesce(rel.status, 'ACTIVE') = 'ACTIVE'
            OPTIONAL MATCH path = (source)-[:HAS_SKILL_PREREQUISITE*1..5]->(ancestor:MicroSkill)
            RETURN source.code AS sourceCode, source.name AS sourceName,
                   target.code AS targetCode, target.name AS targetName,
                   rel.dependentKnowledgeLevel AS dependentLevel,
                   rel.prerequisiteKnowledgeLevel AS prerequisiteLevel,
                   length(path) AS depth
            ORDER BY source.code ASC, target.code ASC
            """;

    // 4. Pathway Catalog Query: Full multi-entity traversal for adaptive baseline pathway snapshot
    public static final String Q4_PATHWAY_CATALOG_QUERY = """
            MATCH (jobPosition:JobPosition {id:$jobPosition}) WHERE jobPosition.status='ACTIVE'
              AND (jobPosition.organizationId IS NULL OR jobPosition.organizationId=$organization)
            OPTIONAL MATCH (jobPosition)-[membership:HAS_ROLE]->(role:TargetRole)
            WHERE membership.status='ACTIVE' AND role.status IN ['ACTIVE','PUBLISHED']
              AND (role.organizationId IS NULL OR role.organizationId=$organization)
              AND (membership.organizationId IS NULL OR membership.organizationId=$organization)
            OPTIONAL MATCH (owner:JobPosition)-[ownership:HAS_ROLE]->(role)
            WHERE owner.status='ACTIVE' AND ownership.status='ACTIVE'
            WITH jobPosition,membership,role,collect(DISTINCT owner.id) AS owners
            OPTIONAL MATCH (role)-[roleLevel:HAS_LEVEL]->(level:Level)-[requirement:REQUIRES_SKILL]->(skill:MicroSkill)
            WHERE roleLevel.status='ACTIVE' AND level.status='ACTIVE' AND requirement.status='ACTIVE' AND skill.status='ACTIVE'
              AND (roleLevel.organizationId IS NULL OR roleLevel.organizationId=$organization)
              AND (level.organizationId IS NULL OR level.organizationId=$organization)
              AND (requirement.organizationId IS NULL OR requirement.organizationId=$organization)
              AND (skill.organizationId IS NULL OR skill.organizationId=$organization)
            RETURN elementId(jobPosition) AS jobPositionNode,elementId(role) AS roleNode,elementId(level) AS levelNode,elementId(skill) AS skillNode,
                   properties(jobPosition) AS jobPosition,properties(membership) AS membership,properties(role) AS role,
                   owners,properties(roleLevel) AS roleLevel,properties(level) AS level,
                   properties(requirement) AS requirement,properties(skill) AS skill
            """;

    public record BenchmarkResult(
            String queryId,
            String queryName,
            int returnedRecordCount,
            double[] runTimingsMs,
            double minMs,
            double maxMs,
            double meanMs,
            double medianMs,
            double p95Ms,
            boolean passedSla
    ) {}

    @BeforeAll
    void setup() {
        String uri = System.getenv().getOrDefault("NEO4J_URI", "bolt://127.0.0.1:7687");
        String user = System.getenv().getOrDefault("NEO4J_USER", "neo4j");
        String pass = System.getenv().getOrDefault("NEO4J_PASSWORD", "local-only-neo4j");
        driver = GraphDatabase.driver(uri, AuthTokens.basic(user, pass));

        try (Session session = driver.session()) {
            // Version
            Result verRes = session.run("CALL dbms.components() YIELD name, versions, edition RETURN versions[0] AS v;");
            if (verRes.hasNext()) {
                neo4jVersion = verRes.next().get("v").asString();
            }

            // Node counts by label
            Result nodeRes = session.run("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS cnt ORDER BY cnt DESC;");
            while (nodeRes.hasNext()) {
                Record r = nodeRes.next();
                String label = r.get("label").asString("Unknown");
                long cnt = r.get("cnt").asLong();
                nodeCountsByLabel.put(label, cnt);
                totalNodes += cnt;
            }

            // Relationship counts by type
            Result relRes = session.run("MATCH ()-[r]->() RETURN type(r) AS relType, count(r) AS cnt ORDER BY cnt DESC;");
            while (relRes.hasNext()) {
                Record r = relRes.next();
                String relType = r.get("relType").asString("Unknown");
                long cnt = r.get("cnt").asLong();
                relCountsByType.put(relType, cnt);
                totalRelationships += cnt;
            }
        }
    }

    @AfterAll
    void teardown() {
        if (driver != null) {
            driver.close();
        }
    }

    private BenchmarkResult executeBenchmark(
            String queryId,
            String queryName,
            String cypher,
            Map<String, Object> params
    ) {
        try (Session session = driver.session()) {
            // 1. Warm-up runs (discarded)
            for (int w = 0; w < WARMUP_RUNS; w++) {
                Result r = session.run(cypher, params);
                r.list(); // fully consume
            }

            // 2. Measured runs
            double[] timings = new double[MEASURED_RUNS];
            int recordCount = 0;

            for (int i = 0; i < MEASURED_RUNS; i++) {
                long startNanos = System.nanoTime();
                Result result = session.run(cypher, params);
                List<Record> consumed = result.list(); // execute + consume
                long durationNanos = System.nanoTime() - startNanos;

                timings[i] = durationNanos / 1_000_000.0;
                recordCount = consumed.size();
            }

            double[] sorted = timings.clone();
            Arrays.sort(sorted);
            double min = sorted[0];
            double max = sorted[MEASURED_RUNS - 1];
            double sum = 0;
            for (double t : timings) sum += t;
            double mean = sum / MEASURED_RUNS;
            double median = (sorted[4] + sorted[5]) / 2.0;
            // 95th percentile index on 10 elements: sorted[9]
            double p95 = sorted[sorted.length - 1];
            boolean passed = max < SLA_MAX_MS;

            return new BenchmarkResult(queryId, queryName, recordCount, timings, min, max, mean, median, p95, passed);
        }
    }

    @Test
    @DisplayName("NFR-P02: Benchmark 4 Representative Graph Queries against SLA (<= 1000 ms)")
    void testGraphQueriesPerformanceBenchmark() {
        System.out.println("================================================================================");
        System.out.println("NFR-P02 GRAPH QUERY PERFORMANCE BENCHMARK (Report 5 / Quality Attribute)");
        System.out.println("Responsible Member: Nguyễn Anh Khôi");
        System.out.println("Target SLA: Every query execution & result consumption <= 1.0 s (1000 ms)");
        System.out.printf("Database: Neo4j %s | Total Nodes: %d | Total Relationships: %d%n",
                neo4jVersion, totalNodes, totalRelationships);
        System.out.println("Labels: " + nodeCountsByLabel);
        System.out.println("Relationships: " + relCountsByType);
        System.out.println("================================================================================");

        List<BenchmarkResult> results = new ArrayList<>();

        // Q1: Target Role Hierarchy
        BenchmarkResult r1 = executeBenchmark(
                "Q1",
                "Target Role Hierarchical Traversal (Levels, Competencies, Required Skills)",
                Q1_ROLE_QUERY,
                Map.of("organizationId", DEFAULT_ORG, "code", "APPLICATION_DEVELOPER")
        );
        results.add(r1);

        // Q2: Micro-Skill & Taxonomy
        BenchmarkResult r2 = executeBenchmark(
                "Q2",
                "Micro-Skill & Competency Taxonomy Search with Certificate Requirements",
                Q2_SKILL_QUERY,
                Map.of("organizationId", DEFAULT_ORG)
        );
        results.add(r2);

        // Q3: Directed Skill Prerequisite DAG
        BenchmarkResult r3 = executeBenchmark(
                "Q3",
                "Directed Skill Prerequisite DAG Traversal & Multi-Hop Path Reachability",
                Q3_PREREQUISITE_QUERY,
                Map.of("organizationId", DEFAULT_ORG)
        );
        results.add(r3);

        // Q4: Pathway Baseline Catalog Snapshot
        BenchmarkResult r4 = executeBenchmark(
                "Q4",
                "Adaptive Baseline Pathway Catalog Multi-Entity Expansion",
                Q4_PATHWAY_CATALOG_QUERY,
                Map.of("organization", DEFAULT_ORG, "jobPosition", "OCC-15-1252.00")
        );
        results.add(r4);

        // Print Formatted Output Table
        System.out.printf(Locale.ROOT, "%-4s | %-38s | %-7s | %-8s | %-8s | %-8s | %-8s | %-8s | %-6s%n",
                "ID", "Query Name", "Records", "Min (ms)", "Max (ms)", "Mean(ms)", "P50 (ms)", "P95 (ms)", "Status");
        System.out.println("-----+----------------------------------------+---------+----------+----------+----------+----------+----------+-------");

        for (BenchmarkResult r : results) {
            System.out.printf(Locale.ROOT, "%-4s | %-38.38s | %-7d | %8.2f | %8.2f | %8.2f | %8.2f | %8.2f | %-6s%n",
                    r.queryId(), r.queryName(), r.returnedRecordCount(),
                    r.minMs(), r.maxMs(), r.meanMs(), r.medianMs(), r.p95Ms(),
                    r.passedSla() ? "PASSED" : "FAILED");
            assertTrue(r.passedSla(), "Query " + r.queryId() + " exceeded SLA limit of " + SLA_MAX_MS + " ms (max: " + r.maxMs() + " ms)");
        }

        System.out.println("================================================================================");
        System.out.println("DETAILED 10-RUN MEASUREMENT MATRIX (Retain all timings):");
        for (BenchmarkResult r : results) {
            System.out.printf("%s (%s):%n  Runs [1..10]: ", r.queryId(), r.queryName());
            for (int i = 0; i < r.runTimingsMs().length; i++) {
                System.out.printf(Locale.ROOT, "#%d: %.2f ms%s", i + 1, r.runTimingsMs()[i], i == 9 ? "" : ", ");
            }
            System.out.println();
        }
        System.out.println("================================================================================");
    }

    public static void main(String[] args) {
        GraphQueryPerformanceBenchmarkTest benchmark = new GraphQueryPerformanceBenchmarkTest();
        benchmark.setup();
        try {
            benchmark.testGraphQueriesPerformanceBenchmark();
        } finally {
            benchmark.teardown();
        }
    }
}

