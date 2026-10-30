package com.adaptlearngraph.assessment.adaptive.psychometrics;

import java.util.Comparator;
import java.util.List;
import static com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.*;
import static com.adaptlearngraph.assessment.adaptive.psychometrics.Irt3pl.*;

/** Scan positive-to-negative score brackets, bisect each mode, compare log posteriors. No mutable warm start. */
public final class MapAbilityEstimator {
    public Estimate estimate(Model policy, List<Observation> input) {
        if (policy == null) throw new Failure(Code.INVALID_POLICY);
        if (input == null || input.stream().anyMatch(r -> r == null || r.item() == null)) throw new Failure(Code.INVALID_HISTORY);
        var responses = input.stream().sorted(Comparator.comparing(r -> r.item().id().toString())).toList();
        if (responses.size() > policy.maxResponses()
                || responses.stream().map(r -> r.item().id()).distinct().count() != responses.size()
                || responses.stream().map(r -> r.item().skillId()).distinct().count() > 1) throw new Failure(Code.INVALID_HISTORY);
        responses.forEach(r -> policy.validate(r.item()));
        if (responses.isEmpty()) return new Estimate(policy.priorMean(), policy.priorSd(), 0, 0);
        double width = (policy.thetaUpper() - policy.thetaLower()) / policy.gridIntervals();
        double theta = policy.thetaLower(), value = posterior(policy, responses, theta);
        double upper = posterior(policy, responses, policy.thetaUpper());
        if (upper > value) { theta = policy.thetaUpper(); value = upper; }
        double leftScore = gradient(policy, responses, policy.thetaLower());
        for (int i = 1; i <= policy.gridIntervals(); i++) {
            double right = policy.thetaLower() + i * width, rightScore = gradient(policy, responses, right);
            if (leftScore >= 0 && rightScore <= 0) {
                double candidate = refine(policy, responses, right - width, right), score = posterior(policy, responses, candidate);
                if (score > value) { theta = candidate; value = score; }
            }
            leftScore = rightScore;
        }
        if (theta <= policy.thetaLower() + policy.thetaTolerance() || theta >= policy.thetaUpper() - policy.thetaTolerance()) {
            throw new Failure(Code.SEARCH_BOUNDARY);
        }
        double precision = 1 / (policy.priorSd() * policy.priorSd());
        double gradient = -(theta - policy.priorMean()) * precision, curvature = precision, information = 0;
        for (Observation response : responses) {
            gradient += Irt3pl.score(response, theta); curvature += Irt3pl.negativeCurvature(response, theta);
            information += Irt3pl.information(response.item(), theta);
        }
        finite(gradient, curvature, information);
        if (curvature <= 0 || StrictMath.abs(gradient) > policy.gradientTolerance()) throw new Failure(Code.NON_CONVERGENCE);
        return new Estimate(theta, 1 / StrictMath.sqrt(curvature), information, responses.size());
    }
    private double posterior(Model policy, List<Observation> responses, double theta) {
        double normalized = (theta - policy.priorMean()) / policy.priorSd(), value = -.5 * normalized * normalized;
        for (Observation response : responses) value += Irt3pl.logLikelihood(response, theta);
        finite(value); return value;
    }
    private double refine(Model policy, List<Observation> responses, double left, double right) {
        int iteration = 0;
        while (right - left > policy.thetaTolerance() && iteration++ < policy.maxIterations()) {
            double middle = (left + right) / 2;
            if (gradient(policy, responses, middle) > 0) left = middle; else right = middle;
        }
        if (right - left > policy.thetaTolerance()) throw new Failure(Code.NON_CONVERGENCE);
        return (left + right) / 2;
    }
    private double gradient(Model policy, List<Observation> responses, double theta) {
        double value = -(theta - policy.priorMean()) / (policy.priorSd() * policy.priorSd());
        for (Observation response : responses) value += Irt3pl.score(response, theta);
        finite(value); return value;
    }
}
