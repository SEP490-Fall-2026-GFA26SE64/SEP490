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

/** platform.baseline_management_command: append-only idempotent baseline management command receipts. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_management_command")
@IdClass(BaselineManagementCommandEntity.Key.class)
@DynamicInsert
public class BaselineManagementCommandEntity {
    @Id
    @Column(name = "actor_id")
    private UUID actorId;
    @Id
    @Column(name = "idempotency_key")
    private String idempotencyKey;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "occupation_id", nullable = false)
    private String occupationId;
    @Column(name = "operation", nullable = false)
    private String operation;
    @Column(name = "request_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestHash;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_json", nullable = false, columnDefinition = "jsonb")
    private String responseJson;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected BaselineManagementCommandEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineManagementCommandEntity(UUID actorId, String idempotencyKey, UUID organizationId, String occupationId, String operation, String requestHash, String responseJson, Instant createdAt) {
        this.actorId = actorId;
        this.idempotencyKey = idempotencyKey;
        this.organizationId = organizationId;
        this.occupationId = occupationId;
        this.operation = operation;
        this.requestHash = requestHash;
        this.responseJson = responseJson;
        this.createdAt = createdAt;
    }

    public UUID getActorId() { return actorId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public UUID getOrganizationId() { return organizationId; }
    public String getOccupationId() { return occupationId; }
    public String getOperation() { return operation; }
    public String getRequestHash() { return requestHash; }
    public String getResponseJson() { return responseJson; }
    public Instant getCreatedAt() { return createdAt; }

    public record Key(UUID actorId, String idempotencyKey) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
