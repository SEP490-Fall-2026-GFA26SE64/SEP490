package com.adaptlearngraph.assessment.adaptive.psychometrics;

import java.util.UUID;
import static com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.*;

/** D=1 logistic metric. Complement/log functions avoid subtracting rounded probabilities from one. */
public final class Irt3pl {
    private Irt3pl() {}
    public record Item(UUID id, String skillId, UUID parameterSetId, double a, double b, double c) {
        public Item {
            AdaptiveIrtPolicy.id(id); AdaptiveIrtPolicy.id(parameterSetId); finite(Code.INVALID_ITEM, a, b, c);
            if (skillId == null || skillId.isBlank() || !skillId.equals(skillId.strip()) || a <= 0 || c < 0 || c >= 1) {
                throw new Failure(Code.INVALID_ITEM);
            }
        }
    }
    public record Answer(UUID itemId, boolean correct) {
        public Answer { if (itemId == null || itemId.equals(new UUID(0, 0))) throw new Failure(Code.INVALID_HISTORY); }
    }
    public record Observation(Item item, boolean correct) {}
    /** Information excludes the prior. SE is local Laplace posterior SD, not exact/frequentist/calibrated SE. */
    public record Estimate(double theta, double standardError, double information, int answeredCount) {
        public Estimate {
            finite(theta, standardError, information);
            if (standardError <= 0 || information < 0 || answeredCount < 0) throw new Failure(Code.NUMERICAL_FAILURE);
        }
    }
    public static double logistic(double value) {
        finite(value);
        double tail = StrictMath.exp(-StrictMath.abs(value));
        return value >= 0 ? 1 / (1 + tail) : tail / (1 + tail);
    }
    private static double z(Item item, double theta) { double z = item.a() * (theta - item.b()); finite(z); return z; }
    private static double softplus(double z) { return StrictMath.max(0, z) + StrictMath.log1p(StrictMath.exp(-StrictMath.abs(z))); }
    public static double probability(Item item, double theta) { return item.c() + (1 - item.c()) * logistic(z(item, theta)); }
    static double logLikelihood(Observation response, double theta) {
        Item item = response.item(); double z = z(item, theta);
        if (!response.correct()) return StrictMath.log1p(-item.c()) - softplus(z);
        if (item.c() == 0) return -softplus(-z);
        return z < 0 ? StrictMath.log(probability(item, theta)) : StrictMath.log1p(-(1 - item.c()) * logistic(-z));
    }
    public static double information(Item item, double theta) {
        double z = z(item, theta), s = logistic(z), t = logistic(-z);
        double ratio = item.c() == 0 ? 1 : s / (item.c() + (1 - item.c()) * s);
        double result = item.a() * item.a() * (1 - item.c()) * s * t * ratio;
        finite(result); return result;
    }
    static double score(Observation response, double theta) {
        Item item = response.item(); double z = z(item, theta), s = logistic(z), t = logistic(-z);
        return response.correct() ? item.c() == 0 ? item.a() * t
                : item.a() * (1 - item.c()) * s * t / probability(item, theta) : -item.a() * s;
    }
    static double negativeCurvature(Observation response, double theta) {
        Item item = response.item(); double z = z(item, theta), s = logistic(z), t = logistic(-z);
        double score = score(response, theta);
        return !response.correct() || item.c() == 0 ? item.a() * item.a() * s * t : score * (score - item.a() * (t - s));
    }
}
