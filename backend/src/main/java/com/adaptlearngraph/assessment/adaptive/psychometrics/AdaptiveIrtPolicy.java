package com.adaptlearngraph.assessment.adaptive.psychometrics;

import java.util.UUID;

/** Typed, system-owned configuration. Reference factories create NEW version content, never missing-field defaults. */
public final class AdaptiveIrtPolicy {
    private AdaptiveIrtPolicy() {}
    public enum Code { INVALID_POLICY, INVALID_ITEM, INVALID_HISTORY, INFEASIBLE_SCOPE, NUMERICAL_FAILURE, SEARCH_BOUNDARY, NON_CONVERGENCE }
    public static final class Failure extends RuntimeException {
        private final Code code;
        public Failure(Code code) { super("Adaptive IRT: " + code); this.code = code; }
        public Code code() { return code; }
    }
    public record Model(String algorithm, double priorMean, double priorSd, double thetaLower, double thetaUpper,
                        int gridIntervals, int maxIterations, double thetaTolerance, double gradientTolerance,
                        int minimumPerSkill, int maxResponses, double stopSe, double highConfidenceSe,
                        double mediumConfidenceSe, double minA, double maxA, double maxAbsB, double maxC) {
        public Model {
            finite(Code.INVALID_POLICY, priorMean, priorSd, thetaLower, thetaUpper, thetaTolerance, gradientTolerance,
                    stopSe, highConfidenceSe, mediumConfidenceSe, minA, maxA, maxAbsB, maxC);
            if (!"MAP_GRID_BISECTION_LAPLACE_V1".equals(algorithm) || priorSd < .1 || priorSd > 5
                    || thetaLower < -12 || thetaUpper > 12 || thetaUpper - thetaLower < 1
                    || priorMean <= thetaLower || priorMean >= thetaUpper || gridIntervals < 32 || gridIntervals > 4096
                    || maxIterations < 16 || maxIterations > 256 || thetaTolerance < 1e-10 || thetaTolerance > 1e-3
                    || gradientTolerance < 1e-8 || gradientTolerance > 1e-2 || minimumPerSkill < 1
                    || maxResponses < minimumPerSkill || maxResponses > 4096 || stopSe <= 0
                    || highConfidenceSe <= 0 || mediumConfidenceSe <= highConfidenceSe
                    || minA < 1e-4 || maxA < minA || maxA > 10 || maxAbsB <= 0 || maxAbsB > 12 || maxC < 0 || maxC > .95) {
                throw new Failure(Code.INVALID_POLICY);
            }
        }
        public void validate(Irt3pl.Item item) {
            if (item.a() < minA || item.a() > maxA || StrictMath.abs(item.b()) > maxAbsB || item.c() > maxC) {
                throw new Failure(Code.INVALID_ITEM);
            }
        }
    }
    public record Mapping(String algorithm, double k) {
        public Mapping {
            finite(Code.INVALID_POLICY, k);
            if (!"LOGISTIC_CONSERVATIVE_V1".equals(algorithm) || k <= 0 || k > 10) throw new Failure(Code.INVALID_POLICY);
        }
    }
    /** IDs are supplied together with exact configurations by the authorized pinned-version adapter. */
    public record Versions(UUID modelVersionId, UUID masteryMappingVersionId, UUID parameterSetId, Model model, Mapping mapping) {
        public Versions {
            if (modelVersionId == null || masteryMappingVersionId == null || parameterSetId == null
                    || modelVersionId.equals(new UUID(0, 0)) || masteryMappingVersionId.equals(new UUID(0, 0))
                    || parameterSetId.equals(new UUID(0, 0)) || model == null || mapping == null) throw new Failure(Code.INVALID_POLICY);
        }
    }
    public static Model referenceModelV1() {
        return new Model("MAP_GRID_BISECTION_LAPLACE_V1", 0, 1, -8, 8, 1024, 96, 1e-8, 1e-5,
                3, 4096, .5, .35, .7, .05, 10, 12, .95);
    }
    public static Mapping referenceMappingV1() { return new Mapping("LOGISTIC_CONSERVATIVE_V1", 1); }
    static void id(UUID id) { if (id == null || id.equals(new UUID(0, 0))) throw new Failure(Code.INVALID_ITEM); }
    static void finite(double... values) {
        finite(Code.NUMERICAL_FAILURE, values);
    }
    static void finite(Code code, double... values) {
        for (double value : values) if (!Double.isFinite(value)) throw new Failure(code);
    }
}
