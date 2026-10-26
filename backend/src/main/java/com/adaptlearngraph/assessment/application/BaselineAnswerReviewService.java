package com.adaptlearngraph.assessment.application;

import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase;
import com.adaptlearngraph.assessment.application.port.out.BaselineAnswerReviewAuthorizer;
import com.adaptlearngraph.assessment.application.port.out.BaselineAnswerReviewStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.ActorPort;
import java.time.Clock;
import java.util.UUID;

public final class BaselineAnswerReviewService implements BaselineAnswerReviewUseCase {
    private final ActorPort actors;
    private final BaselineAnswerReviewAuthorizer authorizer;
    private final BaselineAnswerReviewStore store;
    private final Clock clock;

    public BaselineAnswerReviewService(
            ActorPort actors, BaselineAnswerReviewAuthorizer authorizer,
            BaselineAnswerReviewStore store) {
        this(actors, authorizer, store, Clock.systemUTC());
    }

    BaselineAnswerReviewService(
            ActorPort actors, BaselineAnswerReviewAuthorizer authorizer,
            BaselineAnswerReviewStore store, Clock clock) {
        this.actors = actors;
        this.authorizer = authorizer;
        this.store = store;
        this.clock = clock;
    }

    @Override
    public AnswerReview reveal(UUID assessmentVersionId) {
        Actor actor = actors.currentActor()
                .orElseThrow(() -> failure(Code.UNAUTHENTICATED, "Authentication is required", null));
        if (!actor.isActiveLdManager() || !authorizer.canReveal(actor, assessmentVersionId)) {
            throw failure(Code.FORBIDDEN, "Protected answers are not available", null);
        }
        try {
            UUID organizationId = UUID.fromString(actor.organizationId());
            return new AnswerReview(assessmentVersionId, store.revealAndAudit(
                    organizationId, assessmentVersionId, actor.accountId(), clock.instant()));
        } catch (IllegalArgumentException invalidOrganization) {
            throw failure(Code.FORBIDDEN, "Actor organization is invalid", invalidOrganization);
        } catch (BaselineAnswerReviewStore.NotFound missing) {
            throw failure(Code.NOT_FOUND, missing.getMessage(), missing);
        } catch (BaselineAnswerReviewStore.DependencyUnavailable unavailable) {
            throw failure(Code.DEPENDENCY_UNAVAILABLE, unavailable.getMessage(), unavailable);
        }
    }

    private static Failure failure(Code code, String message, Throwable cause) {
        return new Failure(code, message, cause);
    }
}
