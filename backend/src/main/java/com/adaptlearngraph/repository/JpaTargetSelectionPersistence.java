package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.TargetSelectionEntity;
import com.adaptlearngraph.repository.TargetSelectionStorePort.LearnerTargetState;
import com.adaptlearngraph.repository.TargetSelectionStorePort.PendingSelectionRequest;
import com.adaptlearngraph.repository.TargetSelectionStorePort.StoredSelectionRequest;
import com.adaptlearngraph.entities.TargetRoleSelection;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.PageRequest;

/** JPA store for the PostgreSQL-owned target-selection transaction. */
public final class JpaTargetSelectionPersistence implements TargetSelectionStorePort {
    private static final String OPERATION = "SELECT_TARGET_ROLE";

    private final SelectionLearnerJpaRepository learners;
    private final TargetSelectionJpaRepository selections;
    private final TargetSelectionRequestJpaRepository requests;
    private final JpaTargetSelectionRowMapper rowMapper;
    private final ObjectMapper objectMapper;

    public JpaTargetSelectionPersistence(
            SelectionLearnerJpaRepository learners,
            TargetSelectionJpaRepository selections,
            TargetSelectionRequestJpaRepository requests,
            JpaTargetSelectionRowMapper rowMapper,
            ObjectMapper objectMapper) {
        this.learners = Objects.requireNonNull(learners, "learners must not be null");
        this.selections = Objects.requireNonNull(selections, "selections must not be null");
        this.requests = Objects.requireNonNull(requests, "requests must not be null");
        this.rowMapper = Objects.requireNonNull(rowMapper, "rowMapper must not be null");
        this.objectMapper = Objects.requireNonNull(objectMapper, "objectMapper must not be null");
    }

    @Override
    public LearnerTargetState lockLearner(UUID learnerId) {
        requireIdentity(learnerId, "learnerId");
        List<UUID> locked = learners.lock(learnerId);
        if (locked.isEmpty()) {
            throw new EmptyResultDataAccessException(1);
        }
        return new LearnerTargetState(locked.getFirst(), learners.targetRevision(learnerId).getFirst());
    }

    @Override
    public Optional<TargetRoleSelection> findActiveSelection(UUID learnerId) {
        requireIdentity(learnerId, "learnerId");
        return single(selections.active(learnerId).stream().map(rowMapper::map).toList());
    }

    @Override
    public Optional<TargetRoleSelection> findSelection(
            UUID learnerId,
            UUID selectionId,
            long targetRevision) {
        requireIdentity(learnerId, "learnerId");
        requireIdentity(selectionId, "selectionId");
        if (targetRevision < 1) {
            throw new IllegalArgumentException("targetRevision must be positive");
        }
        return single(selections.historical(learnerId, selectionId, targetRevision, OPERATION, PageRequest.of(0, 1))
                .stream().map(rowMapper::map).toList());
    }

    @Override
    public Optional<StoredSelectionRequest> findRequest(UUID actorId, String idempotencyKey) {
        requireIdentity(actorId, "actorId");
        requireText(idempotencyKey, "idempotencyKey");
        return single(requests.find(actorId, OPERATION, idempotencyKey).stream().map(rowMapper::mapRequest).toList());
    }

    @Override
    public boolean claimRequest(PendingSelectionRequest request) {
        Objects.requireNonNull(request, "request must not be null");
        int inserted = requests.claim(
                request.requestId(),
                request.actorId(),
                OPERATION,
                request.idempotencyKey(),
                request.requestHash(),
                request.createdAt());
        return inserted == 1;
    }

    @Override
    public void endSelection(UUID learnerId, UUID selectionId, Instant endedAt) {
        requireIdentity(learnerId, "learnerId");
        requireIdentity(selectionId, "selectionId");
        Objects.requireNonNull(endedAt, "endedAt must not be null");
        requireOne("end active target selection", selections.end(learnerId, selectionId, endedAt));
    }

    @Override
    public void insertSelection(TargetRoleSelection selection) {
        Objects.requireNonNull(selection, "selection must not be null");
        selections.insert(new TargetSelectionEntity(
                selection.selectionId(),
                selection.learnerId(),
                selection.catalogReferenceId(),
                "TARGET_ROLE",
                selection.selectedAt(),
                selection.endedAt(),
                writeSnapshot(selection)));
    }

    @Override
    public void updateTargetRevision(UUID learnerId, long expectedRevision, long newRevision) {
        requireIdentity(learnerId, "learnerId");
        if (expectedRevision < 0 || newRevision < 1 || newRevision != expectedRevision + 1) {
            throw new IllegalArgumentException("target revision must increment exactly once");
        }
        requireOne("increment target revision", learners.updateTargetRevision(learnerId, expectedRevision, newRevision));
    }

    @Override
    public void completeRequest(
            UUID requestId,
            UUID selectionId,
            long targetRevision,
            boolean changed,
            Instant completedAt) {
        requireIdentity(requestId, "requestId");
        requireIdentity(selectionId, "selectionId");
        if (targetRevision < 1) {
            throw new IllegalArgumentException("targetRevision must be positive");
        }
        Objects.requireNonNull(completedAt, "completedAt must not be null");
        requireOne("complete target selection request",
                requests.complete(requestId, OPERATION, selectionId, targetRevision, changed, completedAt));
    }

    @Override
    public void rejectRequest(UUID requestId, String outcomeCode, Instant completedAt) {
        requireIdentity(requestId, "requestId");
        requireText(outcomeCode, "outcomeCode");
        Objects.requireNonNull(completedAt, "completedAt must not be null");
        requireOne("reject target selection request", requests.reject(requestId, OPERATION, outcomeCode, completedAt));
    }

    private String writeSnapshot(TargetRoleSelection selection) {
        try {
            return objectMapper.writeValueAsString(selection.roleSnapshot());
        } catch (JsonProcessingException invalidSnapshot) {
            throw new IllegalStateException("Target role snapshot could not be serialized", invalidSnapshot);
        }
    }

    private static void requireOne(String operation, int affectedRows) {
        if (affectedRows != 1) {
            throw new IllegalStateException(operation + " affected " + affectedRows + " rows instead of one");
        }
    }

    private static <T> Optional<T> single(List<T> rows) {
        if (rows.size() > 1) {
            throw new IllegalStateException("Persistence invariant returned more than one row");
        }
        return rows.stream().findFirst();
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
        return value;
    }
}
