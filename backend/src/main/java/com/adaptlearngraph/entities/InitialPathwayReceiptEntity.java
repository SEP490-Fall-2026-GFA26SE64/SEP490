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

/** platform.initial_pathway_receipt: recorded initial pathway command replies (trigger initial_pathway_receipt_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_receipt")
@IdClass(InitialPathwayReceiptEntity.Key.class)
@DynamicInsert
public class InitialPathwayReceiptEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "actor_id")
    private UUID actorId;
    @Id
    @Column(name = "operation")
    private String operation;
    @Id
    @Column(name = "resource")
    private String resource;
    @Id
    @Column(name = "retry_key")
    private String retryKey;
    @Column(name = "body_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String bodyHash;
    @Column(name = "http_status", nullable = false)
    private Integer httpStatus;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response", nullable = false, columnDefinition = "jsonb")
    private String response;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected InitialPathwayReceiptEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayReceiptEntity(UUID organizationId, UUID actorId, String operation, String resource, String retryKey, String bodyHash, Integer httpStatus, String response, Instant createdAt) {
        this.organizationId = organizationId;
        this.actorId = actorId;
        this.operation = operation;
        this.resource = resource;
        this.retryKey = retryKey;
        this.bodyHash = bodyHash;
        this.httpStatus = httpStatus;
        this.response = response;
        this.createdAt = createdAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getActorId() { return actorId; }
    public String getOperation() { return operation; }
    public String getResource() { return resource; }
    public String getRetryKey() { return retryKey; }
    public String getBodyHash() { return bodyHash; }
    public Integer getHttpStatus() { return httpStatus; }
    public String getResponse() { return response; }
    public Instant getCreatedAt() { return createdAt; }

    public record Key(UUID organizationId, UUID actorId, String operation, String resource, String retryKey) implements Serializable {
        public Key() {
            this(null, null, null, null, null);
        }
    }
}
