package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.target_selection_request: idempotent F02 target-selection command claims and outcomes. */
@Entity
@Table(schema = "platform", name = "target_selection_request")
@DynamicInsert
@DynamicUpdate
public class TargetSelectionRequestEntity {
    @Id
    @Column(name = "request_id")
    private UUID requestId;
    @Column(name = "actor_id", nullable = false, updatable = false)
    private UUID actorId;
    @Column(name = "operation", nullable = false)
    private String operation;
    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;
    @Column(name = "request_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestHash;
    @Column(name = "status", nullable = false)
    private String status;
    @Column(name = "result_selection_id")
    private UUID resultSelectionId;
    @Column(name = "result_target_revision")
    private Long resultTargetRevision;
    @Column(name = "result_changed")
    private Boolean resultChanged;
    @Column(name = "outcome_code")
    private String outcomeCode;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "completed_at")
    private Instant completedAt;

    protected TargetSelectionRequestEntity() {
    }

    @SuppressWarnings("java:S107")
    public TargetSelectionRequestEntity(UUID requestId, UUID actorId, String operation, String idempotencyKey, String requestHash, String status, UUID resultSelectionId, Long resultTargetRevision, Boolean resultChanged, String outcomeCode, Instant createdAt, Instant completedAt) {
        this.requestId = requestId;
        this.actorId = actorId;
        this.operation = operation;
        this.idempotencyKey = idempotencyKey;
        this.requestHash = requestHash;
        this.status = status;
        this.resultSelectionId = resultSelectionId;
        this.resultTargetRevision = resultTargetRevision;
        this.resultChanged = resultChanged;
        this.outcomeCode = outcomeCode;
        this.createdAt = createdAt;
        this.completedAt = completedAt;
    }

    public UUID getRequestId() { return requestId; }
    public UUID getActorId() { return actorId; }
    public String getOperation() { return operation; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getRequestHash() { return requestHash; }
    public String getStatus() { return status; }
    public UUID getResultSelectionId() { return resultSelectionId; }
    public Long getResultTargetRevision() { return resultTargetRevision; }
    public Boolean getResultChanged() { return resultChanged; }
    public String getOutcomeCode() { return outcomeCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCompletedAt() { return completedAt; }
}
