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

/** platform.baseline_assessment_policy_command: immutable idempotency receipts per organization and actor. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_assessment_policy_command")
@IdClass(AssessmentPolicyCommandEntity.Key.class)
@DynamicInsert
public class AssessmentPolicyCommandEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "actor_id")
    private UUID actorId;
    @Id
    @Column(name = "command_key")
    private UUID commandKey;
    @Column(name = "operation", nullable = false)
    private String operation;
    @Column(name = "request_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestHash;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_payload", nullable = false, columnDefinition = "jsonb")
    private String responsePayload;
    @Column(name = "created_at")
    private Instant createdAt;

    protected AssessmentPolicyCommandEntity() {
    }

    public AssessmentPolicyCommandEntity(UUID organizationId, UUID actorId, UUID commandKey, String operation, String requestHash,
            String responsePayload) {
        this.organizationId = organizationId;
        this.actorId = actorId;
        this.commandKey = commandKey;
        this.operation = operation;
        this.requestHash = requestHash;
        this.responsePayload = responsePayload;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getActorId() { return actorId; }
    public UUID getCommandKey() { return commandKey; }
    public String getOperation() { return operation; }
    public String getRequestHash() { return requestHash; }
    public String getResponsePayload() { return responsePayload; }
    public Instant getCreatedAt() { return createdAt; }

    public record Key(UUID organizationId, UUID actorId, UUID commandKey) implements Serializable {
        public Key() {
            this(null, null, null);
        }
    }
}