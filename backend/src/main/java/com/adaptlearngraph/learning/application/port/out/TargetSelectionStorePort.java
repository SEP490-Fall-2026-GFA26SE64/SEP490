package com.adaptlearngraph.learning.application.port.out;

import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** PostgreSQL-facing operations required by the selection application service. */
public interface TargetSelectionStorePort {
    LearnerTargetState lockLearner(UUID learnerId);

    Optional<TargetRoleSelection> findActiveSelection(UUID learnerId);

    Optional<TargetRoleSelection> findSelection(
            UUID learnerId,
            UUID selectionId,
            long targetRevision);

    Optional<StoredSelectionRequest> findRequest(UUID actorId, String idempotencyKey);

    boolean claimRequest(PendingSelectionRequest request);

    void endSelection(UUID learnerId, UUID selectionId, Instant endedAt);

    void insertSelection(TargetRoleSelection selection);

    void updateTargetRevision(UUID learnerId, long expectedRevision, long newRevision);

    void completeRequest(
            UUID requestId,
            UUID selectionId,
            long targetRevision,
            boolean changed,
            Instant completedAt);

    void rejectRequest(UUID requestId, String outcomeCode, Instant completedAt);

    record LearnerTargetState(UUID learnerId, long targetRevision) {
        public LearnerTargetState {
            learnerId = requireIdentity(learnerId, "learnerId");
            if (targetRevision < 0) {
                throw new IllegalArgumentException("targetRevision must not be negative");
            }
        }
    }

    record PendingSelectionRequest(
            UUID requestId,
            UUID actorId,
            String idempotencyKey,
            String requestHash,
            Instant createdAt) {

        public PendingSelectionRequest {
            requestId = requireIdentity(requestId, "requestId");
            actorId = requireIdentity(actorId, "actorId");
            idempotencyKey = requireText(idempotencyKey, "idempotencyKey");
            requestHash = requireHash(requestHash);
            createdAt = Objects.requireNonNull(createdAt, "createdAt must not be null");
        }
    }

    record StoredSelectionRequest(
            UUID requestId,
            String requestHash,
            RequestStatus status,
            UUID resultSelectionId,
            Long resultTargetRevision,
            Boolean resultChanged,
            String outcomeCode) {

        public StoredSelectionRequest {
            requestId = requireIdentity(requestId, "requestId");
            requestHash = requireHash(requestHash);
            status = Objects.requireNonNull(status, "status must not be null");
            if (status == RequestStatus.SUCCEEDED) {
                resultSelectionId = requireIdentity(resultSelectionId, "resultSelectionId");
                if (resultTargetRevision == null || resultTargetRevision < 1) {
                    throw new IllegalArgumentException("successful request requires a positive resultTargetRevision");
                }
                if (resultChanged == null) {
                    throw new IllegalArgumentException("successful request requires resultChanged");
                }
                if (outcomeCode != null) {
                    throw new IllegalArgumentException("successful request must not have an outcomeCode");
                }
            } else if (status == RequestStatus.REJECTED) {
                requireNoResult(resultSelectionId, resultTargetRevision, resultChanged, "rejected");
                outcomeCode = requireText(outcomeCode, "outcomeCode");
            } else {
                requireNoResult(resultSelectionId, resultTargetRevision, resultChanged, "pending");
                if (outcomeCode != null) {
                    throw new IllegalArgumentException("pending request must not have an outcomeCode");
                }
            }
        }

        private static void requireNoResult(
                UUID selectionId,
                Long revision,
                Boolean changed,
                String status) {
            if (selectionId != null || revision != null || changed != null) {
                throw new IllegalArgumentException(status + " request must not have a result");
            }
        }
    }

    enum RequestStatus {
        PENDING,
        SUCCEEDED,
        REJECTED
    }

    private static UUID requireIdentity(UUID value, String field) {
        Objects.requireNonNull(value, field + " must not be null");
        if (value.equals(new UUID(0L, 0L))) {
            throw new IllegalArgumentException(field + " must not be the nil UUID");
        }
        return value;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }

    private static String requireHash(String value) {
        if (value == null || !value.matches("^[0-9a-f]{64}$")) {
            throw new IllegalArgumentException("requestHash must be a lowercase SHA-256 value");
        }
        return value;
    }
}
