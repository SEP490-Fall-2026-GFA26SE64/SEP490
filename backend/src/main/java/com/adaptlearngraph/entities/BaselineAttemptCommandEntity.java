package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.baseline_attempt_command: exact idempotent attempt command receipt; history is immutable (trigger immutable_history). */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_attempt_command")
@IdClass(BaselineAttemptCommandEntity.Key.class)
@DynamicInsert
public class BaselineAttemptCommandEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "actor_id")
    private UUID actorId;
    @Id
    @Column(name = "idempotency_key")
    private String idempotencyKey;
    @Column(name = "attempt_id", nullable = false)
    private UUID attemptId;
    @Column(name = "job_position_id", nullable = false)
    private String jobPositionId;
    @Column(name = "operation", nullable = false)
    private String operation;
    @Column(name = "request_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestHash;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_payload", nullable = false, columnDefinition = "jsonb")
    private String responsePayload;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected BaselineAttemptCommandEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAttemptCommandEntity(UUID organizationId, UUID actorId, String idempotencyKey, UUID attemptId, String jobPositionId, String operation, String requestHash, String responsePayload, Instant createdAt) {
        this.organizationId = organizationId;
        this.actorId = actorId;
        this.idempotencyKey = idempotencyKey;
        this.attemptId = attemptId;
        this.jobPositionId = jobPositionId;
        this.operation = operation;
        this.requestHash = requestHash;
        this.responsePayload = responsePayload;
        this.createdAt = createdAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getActorId() { return actorId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public UUID getAttemptId() { return attemptId; }
    public String getJobPositionId() { return jobPositionId; }
    public String getOperation() { return operation; }
    public String getRequestHash() { return requestHash; }
    public String getResponsePayload() { return responsePayload; }
    public Instant getCreatedAt() { return createdAt; }

    public record Key(UUID organizationId, UUID actorId, String idempotencyKey) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
