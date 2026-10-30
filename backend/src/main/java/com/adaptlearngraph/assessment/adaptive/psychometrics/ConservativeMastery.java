package com.adaptlearngraph.assessment.adaptive.psychometrics;

import java.util.Optional;
import static com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.*;

/** Internal model output. The attempt-wide gate must also pass before persisting any skill result. */
public final class ConservativeMastery {
    private ConservativeMastery() {}
    public enum Confidence { LOW, MEDIUM, HIGH }
    public record Mastery(double estimatedMastery, double mastery, Confidence confidence) {}
    public static Optional<Mastery> map(Model policy, Mapping mapping, Irt3pl.Estimate estimate) {
        if (policy == null || mapping == null) throw new Failure(Code.INVALID_POLICY);
        if (estimate == null) throw new Failure(Code.INVALID_HISTORY);
        if (estimate.answeredCount() < policy.minimumPerSkill()) return Optional.empty();
        double se = estimate.standardError();
        Confidence confidence = se <= policy.highConfidenceSe() ? Confidence.HIGH
                : se <= policy.mediumConfidenceSe() ? Confidence.MEDIUM : Confidence.LOW;
        return Optional.of(new Mastery(Irt3pl.logistic(estimate.theta()), Irt3pl.logistic(estimate.theta() - mapping.k() * se), confidence));
    }
}
