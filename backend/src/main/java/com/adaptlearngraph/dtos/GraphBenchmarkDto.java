package com.adaptlearngraph.dtos;

import java.util.List;

public final class GraphBenchmarkDto {

    public record BenchmarkRequest(
            String scale,
            Integer fixtureSet,
            Integer testRuns,
            Integer warmupRuns,
            Integer minHops,
            Integer maxHops,
            Boolean executeOnLiveCatalog
    ) {}

    public record FixturePreviewItem(
            String startId,
            String startName,
            String startType,
            String targetId,
            String targetName,
            String targetType,
            int hops
    ) {}

    public record StepBreakdown(
            double indexLookupMs,
            double queueInitMs,
            double traversalMs,
            double pathReconstructionMs,
            double totalMeanMs
    ) {}

    public record DifferenceBreakdown(
            double branchingFactorPct,
            double branchingFactorMs,
            double pageCacheMissPct,
            double pageCacheMissMs,
            double bTreeDepthPct,
            double bTreeDepthMs,
            double totalDifferenceMs
    ) {}

    public record PathSample(
            String startId,
            String startName,
            String startType,
            String targetId,
            String targetName,
            String targetType,
            int hops,
            double latencyMs
    ) {}

    public record ScaleComparisonItem(
            String scale,
            String label,
            int nodes,
            int relationships,
            double meanLatencyMs,
            double p95LatencyMs,
            double speedupVsLinear
    ) {}

    public record BenchmarkResponse(
            String researchQuestion,
            String scale,
            String scaleLabel,
            long catalogNodes,
            long catalogRelationships,
            String neo4jVersion,
            int totalRuns,
            int warmupRuns,
            double meanLatencyMs,
            double p95LatencyMs,
            double p50LatencyMs,
            double minLatencyMs,
            double maxLatencyMs,
            double stdDevMs,
            double sublinearScalingFactor,
            StepBreakdown stepBreakdown,
            DifferenceBreakdown differenceBreakdown,
            List<PathSample> samplePaths,
            List<ScaleComparisonItem> scaleComparison,
            List<String> defenseArguments,
            List<Double> recentRuns,
            String executedAt
    ) {}

    public record OverviewResponse(
            String neo4jVersion,
            long totalNodes,
            long totalRelationships,
            List<String> availableScales,
            int defaultRuns,
            int defaultWarmupRuns,
            boolean ready
    ) {}

    private GraphBenchmarkDto() {}
}

