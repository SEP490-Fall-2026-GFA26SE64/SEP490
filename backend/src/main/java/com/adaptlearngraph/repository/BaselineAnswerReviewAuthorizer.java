package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import java.util.UUID;

@FunctionalInterface
public interface BaselineAnswerReviewAuthorizer {
    boolean canReveal(Actor actor, UUID assessmentVersionId);
}
