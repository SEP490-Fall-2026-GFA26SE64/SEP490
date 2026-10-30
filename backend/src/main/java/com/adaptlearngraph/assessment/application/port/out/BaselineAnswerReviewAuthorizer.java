package com.adaptlearngraph.assessment.application.port.out;

import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import java.util.UUID;

@FunctionalInterface
public interface BaselineAnswerReviewAuthorizer {
    boolean canReveal(Actor actor, UUID assessmentVersionId);
}
