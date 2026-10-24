package com.adaptlearngraph.assessment.application.port.in;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

public interface BaselineAnswerReviewUseCase {
    AnswerReview reveal(UUID assessmentVersionId);

    record AnswerReview(UUID assessmentVersionId, List<AnswerItem> items) {
        public AnswerReview {
            Objects.requireNonNull(assessmentVersionId);
            items = List.copyOf(Objects.requireNonNull(items));
        }
    }

    record AnswerItem(UUID itemVersionId, String protectedKeyJson) {
        public AnswerItem {
            Objects.requireNonNull(itemVersionId);
            if (protectedKeyJson == null || protectedKeyJson.isBlank()) {
                throw new IllegalArgumentException("protectedKeyJson must not be blank");
            }
        }
    }

    enum Code { UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, DEPENDENCY_UNAVAILABLE }

    final class Failure extends RuntimeException {
        private final Code code;

        public Failure(Code code, String message, Throwable cause) {
            super(message, cause);
            this.code = Objects.requireNonNull(code);
        }

        public Code code() { return code; }
    }
}
