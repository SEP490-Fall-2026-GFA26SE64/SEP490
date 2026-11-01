package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.BaselineAnswerReviewUseCase.AnswerItem;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface BaselineAnswerReviewStore {
    List<AnswerItem> revealAndAudit(
            UUID organizationId, UUID assessmentVersionId, UUID actorId, Instant revealedAt);

    final class NotFound extends RuntimeException {
        public NotFound(String message) { super(message); }
    }

    final class DependencyUnavailable extends RuntimeException {
        public DependencyUnavailable(String message, Throwable cause) { super(message, cause); }
    }
}
