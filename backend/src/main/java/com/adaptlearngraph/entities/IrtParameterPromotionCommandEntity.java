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

/** Immutable promotion idempotency receipts per organization and actor. */
@Entity
@Immutable
@Table(schema = "platform", name = "irt_parameter_promotion_command")
@IdClass(IrtParameterPromotionCommandEntity.Key.class)
@DynamicInsert
public class IrtParameterPromotionCommandEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "actor_id")
    private UUID actorId;
    @Id
    @Column(name = "idempotency_key")
    private String idempotencyKey;
    @Column(name = "question_bank_id", nullable = false)
    private UUID questionBankId;
    @Column(name = "model_version_id", nullable = false)
    private UUID modelVersionId;
    @Column(name = "request_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestHash;
    @Column(name = "parameter_set_id", nullable = false)
    private UUID parameterSetId;
    @Column(name = "parameter_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String parameterHash;
    @Column(name = "expected_revision", nullable = false)
    private Long expectedRevision;
    @Column(name = "expected_parameter_set_id")
    private UUID expectedParameterSetId;
    @Column(name = "selection_revision", nullable = false)
    private Long selectionRevision;
    @Column(name = "reason", nullable = false)
    private String reason;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected IrtParameterPromotionCommandEntity() {
    }

    @SuppressWarnings("java:S107")
    public IrtParameterPromotionCommandEntity(UUID organizationId, UUID actorId, String idempotencyKey, UUID questionBankId, UUID modelVersionId, String requestHash, UUID parameterSetId, String parameterHash, Long expectedRevision, UUID expectedParameterSetId, Long selectionRevision, String reason, Instant occurredAt) {
        this.organizationId = organizationId;
        this.actorId = actorId;
        this.idempotencyKey = idempotencyKey;
        this.questionBankId = questionBankId;
        this.modelVersionId = modelVersionId;
        this.requestHash = requestHash;
        this.parameterSetId = parameterSetId;
        this.parameterHash = parameterHash;
        this.expectedRevision = expectedRevision;
        this.expectedParameterSetId = expectedParameterSetId;
        this.selectionRevision = selectionRevision;
        this.reason = reason;
        this.occurredAt = occurredAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getActorId() { return actorId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public UUID getQuestionBankId() { return questionBankId; }
    public UUID getModelVersionId() { return modelVersionId; }
    public String getRequestHash() { return requestHash; }
    public UUID getParameterSetId() { return parameterSetId; }
    public String getParameterHash() { return parameterHash; }
    public Long getExpectedRevision() { return expectedRevision; }
    public UUID getExpectedParameterSetId() { return expectedParameterSetId; }
    public Long getSelectionRevision() { return selectionRevision; }
    public String getReason() { return reason; }
    public Instant getOccurredAt() { return occurredAt; }

    public record Key(UUID organizationId, UUID actorId, String idempotencyKey) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}
