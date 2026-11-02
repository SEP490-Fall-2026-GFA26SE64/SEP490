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

/** platform.baseline_attempt_response: server-scored response at one attempt position (trigger adaptive_attempt_child). */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_attempt_response")
@IdClass(BaselineAttemptResponseEntity.Key.class)
@DynamicInsert
public class BaselineAttemptResponseEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Id
    @Column(name = "position")
    private Integer position;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_payload", nullable = false, columnDefinition = "jsonb")
    private String responsePayload;
    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect;
    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;
    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    protected BaselineAttemptResponseEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAttemptResponseEntity(UUID attemptId, UUID organizationId, Integer position, String responsePayload, Boolean isCorrect, Instant acceptedAt, UUID requestId) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.position = position;
        this.responsePayload = responsePayload;
        this.isCorrect = isCorrect;
        this.acceptedAt = acceptedAt;
        this.requestId = requestId;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public Integer getPosition() { return position; }
    public String getResponsePayload() { return responsePayload; }
    public Boolean getIsCorrect() { return isCorrect; }
    public Instant getAcceptedAt() { return acceptedAt; }
    public UUID getRequestId() { return requestId; }

    public record Key(UUID attemptId, Integer position) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
