package com.adaptlearngraph.assessment.adaptive.calibration.domain;

/** Selected simulation policy, deliberately separate from learner MAP/model configuration. No implicit production defaults. */
public record CalibrationPolicy(String algorithm, int quadraturePoints, double thetaLower, double thetaUpper,
        double minA, double maxA, double minB, double maxB, double fixedC, int maxEmIterations, int maxItemSteps,
        int maxBacktracks, int stableIterations, double relativeTolerance, double parameterTolerance,
        double innerTolerance, double likelihoodDecreaseTolerance, double boundaryTolerance,
        int minimumSubjects, int maximumSubjects, int minimumCorrectAndWrong, int maximumObservations,
        long maximumInputBytes, int maximumSeconds, long maximumEvaluations) {
    public CalibrationPolicy {
        Calibration.require("MML_EM_FIXED_C_V1".equals(algorithm));
        Calibration.finite(thetaLower,thetaUpper,minA,maxA,minB,maxB,fixedC,relativeTolerance,parameterTolerance,
                innerTolerance,likelihoodDecreaseTolerance,boundaryTolerance);
        Calibration.require(quadraturePoints == 41 && thetaLower == -5 && thetaUpper == 5 && minA == .25 && maxA == 3
                && minB == -3 && maxB == 3 && fixedC == .25 && maxEmIterations == 200 && maxItemSteps == 50
                && maxBacktracks == 20 && stableIterations == 3 && relativeTolerance == 1e-6 && parameterTolerance == 1e-3
                && innerTolerance == 1e-6 && likelihoodDecreaseTolerance == 1e-8 && boundaryTolerance == 1e-5
                && minimumSubjects == 1000 && maximumSubjects == 5000 && minimumCorrectAndWrong == 50
                && maximumObservations == 1_000_000 && maximumInputBytes == 67_108_864 && maximumSeconds == 300
                && maximumEvaluations == 10_000_000);
    }
    public static CalibrationPolicy syntheticV1() {
        return new CalibrationPolicy("MML_EM_FIXED_C_V1",41,-5,5,.25,3,-3,3,.25,200,50,20,3,
                1e-6,1e-3,1e-6,1e-8,1e-5,1000,5000,50,1_000_000,67_108_864,300,10_000_000);
    }
}
