package com.adaptlearngraph.pathway.domain;

public final class InitialPathwayState {
    public enum Generation { PENDING, GENERATING, SUCCEEDED, NO_LEARNING_REQUIRED, UNRESOLVED, BLOCKED, FAILED_RETRYABLE, STALE }
    public enum Review { NONE, AWAITING_EXPERT_REVIEW, APPROVED, STALE, ARCHIVED }
    public enum Validation { VALID, UNRESOLVED, BLOCKED, STALE }
    public static String display(Generation generation, Review review, Validation validation) {
        if (review == Review.ARCHIVED || review == Review.STALE) return review.name();
        if (review == Review.APPROVED) return "APPROVED";
        if (validation != null && validation != Validation.VALID) return validation.name();
        return review == Review.AWAITING_EXPERT_REVIEW ? review.name() : generation.name();
    }
    private InitialPathwayState() {}
}
