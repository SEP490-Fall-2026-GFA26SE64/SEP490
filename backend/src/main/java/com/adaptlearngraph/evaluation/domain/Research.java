package com.adaptlearngraph.evaluation.domain;

import java.time.Instant;
import java.util.*;

public final class Research {
    private Research() {}
    public static final String RULES_VERSION = "rq2-v3";
    public static final int DEFAULT_ITERATIONS = 1000;
    public static final int MIN_ITERATIONS = 3;
    public static final int MAX_ITERATIONS = 100000;
    public static final int WARMUP = 30;
    public record Node(String label, Map<String,Object> properties) {
        public String id() { return properties.get("id").toString(); }
    }
    public record Edge(String type, String fromId, String toId, Map<String,Object> properties) {}
    public record Workload(int hops, String startId, String moduleId) {}
    public record Graph(List<Node> nodes, List<Edge> edges, List<Workload> workload,
                        String sourceHash, String sourceVersion, long seed, Map<String,Integer> nodeCounts,
                        Map<String,Integer> edgeCounts) {}
    public record Protocol(List<Long> seeds, int pairsPerHop, int rounds) {
        public Protocol { seeds = List.copyOf(seeds); }
    }
    public record Structure(double averageDegree, int maxDegree) {
        public static Structure of(Graph graph) {
            Map<String,Integer> degrees = new HashMap<>();
            for (Edge e : graph.edges()) { degrees.merge(e.fromId(),1,Integer::sum); degrees.merge(e.toId(),1,Integer::sum); }
            return new Structure(2.0 * graph.edges().size() / graph.nodes().size(), degrees.values().stream().mapToInt(i->i).max().orElse(0));
        }
    }
    public record Trial(long seed, int round, Map<Integer,Integer> uniqueByHop, int warmupQueries,
                        Structure structure, int attempted, int errors, int timeouts) {}
    public record Sample(int iteration, int hops, String startId, String moduleId,
                         double latencyMs, int returnedHops, String outcome, String error) {
        public Sample { if (outcome == null) outcome = "SUCCESS"; }
        public Sample(int iteration,int hops,String startId,String moduleId,double latencyMs,int returnedHops) {
            this(iteration,hops,startId,moduleId,latencyMs,returnedHops,"SUCCESS",null);
        }
    }
    public record Metrics(int count, double meanMs, double p95Ms, double minMs, double maxMs, Double medianMs) {
        public Metrics(int count,double meanMs,double p95Ms,double minMs,double maxMs) { this(count,meanMs,p95Ms,minMs,maxMs,null); }
        public static Metrics empty() { return new Metrics(0,0,0,0,0,null); }
        public static Metrics of(List<Sample> samples) {
            if (samples.isEmpty()) throw new IllegalArgumentException("No measured samples");
            double[] sorted = samples.stream().mapToDouble(Sample::latencyMs).sorted().toArray();
            if (Arrays.stream(sorted).anyMatch(x -> !Double.isFinite(x) || x < 0))
                throw new IllegalArgumentException("Invalid latency");
            return new Metrics(sorted.length, Arrays.stream(sorted).average().orElseThrow(),
                sorted[(int)Math.ceil(.95 * sorted.length) - 1], sorted[0], sorted[sorted.length - 1], (sorted[(sorted.length-1)/2] + sorted[sorted.length/2])/2);
        }
    }
    public record Result(int nodeCount, int edgeCount, Map<String,Integer> nodeCounts,
                         Map<String,Integer> edgeCounts, double generationMs, double importMs,
                         Metrics overall, Map<Integer,Metrics> byHop, List<Sample> samples, Trial trial) {
        public Result(int nodeCount,int edgeCount,Map<String,Integer> nodeCounts,Map<String,Integer> edgeCounts,double generationMs,double importMs,Metrics overall,Map<Integer,Metrics> byHop,List<Sample> samples) {
            this(nodeCount,edgeCount,nodeCounts,edgeCounts,generationMs,importMs,overall,byHop,samples,null);
        }
        public Result summary() { return new Result(nodeCount,edgeCount,nodeCounts,edgeCounts,generationMs,importMs,overall,byHop,List.of(),trial); }
    }
    public record Run(UUID id, String createdBy, String status, Instant createdAt, Instant finishedAt,
                      long seed, List<Integer> sizes, String sourceHash, String sourceVersion,
                      String rulesVersion, int iterations, int warmup, int completedQueries,
                      String phase, String failure, Map<String,String> environment, String rulesMarkdown, List<Result> results,
                      Protocol protocol, Integer totalQueries, boolean planReady) {
        public Run { if(totalQueries == null) totalQueries = sizes.size() * iterations; }
        public Run(UUID id,String createdBy,String status,Instant createdAt,Instant finishedAt,long seed,List<Integer> sizes,String sourceHash,String sourceVersion,String rulesVersion,int iterations,int warmup,int completedQueries,String phase,String failure,Map<String,String> environment,String rulesMarkdown,List<Result> results) {
            this(id,createdBy,status,createdAt,finishedAt,seed,sizes,sourceHash,sourceVersion,rulesVersion,iterations,warmup,completedQueries,phase,failure,environment,rulesMarkdown,results,null,sizes.size()*iterations,true);
        }
        public Run planned(int total) {
            return new Run(id,createdBy,status,createdAt,finishedAt,seed,sizes,sourceHash,sourceVersion,rulesVersion,iterations,warmup,completedQueries,phase,failure,environment,rulesMarkdown,results,protocol,total,true);
        }
        public Run progress(String state, int count, String phase, String failure,
                            Map<String,String> environment, List<Result> results) {
            return new Run(id, createdBy, state, createdAt,
                Set.of("SUCCEEDED","FAILED").contains(state) ? Instant.now() : null,
                seed, sizes, sourceHash, sourceVersion, rulesVersion, iterations, warmup,
                count, phase, failure, environment, rulesMarkdown, List.copyOf(results), protocol, totalQueries, planReady);
        }
    }
}
