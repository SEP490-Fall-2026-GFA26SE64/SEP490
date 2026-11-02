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

/** platform.baseline_blueprint_version: immutable fixed Blueprint version. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_blueprint_version")
@IdClass(BaselineBlueprintVersionEntity.Key.class)
@DynamicInsert
public class BaselineBlueprintVersionEntity {
    @Id
    @Column(name = "blueprint_id")
    private UUID blueprintId;
    @Id
    @Column(name = "version")
    private Integer version;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "occupation_id")
    private String occupationId;
    @Column(name = "occupation_name_snapshot")
    private String occupationNameSnapshot;
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;
    @Column(name = "request_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestHash;

    protected BaselineBlueprintVersionEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineBlueprintVersionEntity(UUID blueprintId, Integer version, String name, String occupationId, String occupationNameSnapshot, UUID createdBy, Instant createdAt, String idempotencyKey, String requestHash) {
        this.blueprintId = blueprintId;
        this.version = version;
        this.name = name;
        this.occupationId = occupationId;
        this.occupationNameSnapshot = occupationNameSnapshot;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.idempotencyKey = idempotencyKey;
        this.requestHash = requestHash;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public Integer getVersion() { return version; }
    public String getName() { return name; }
    public String getOccupationId() { return occupationId; }
    public String getOccupationNameSnapshot() { return occupationNameSnapshot; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getRequestHash() { return requestHash; }

    public record Key(UUID blueprintId, Integer version) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
