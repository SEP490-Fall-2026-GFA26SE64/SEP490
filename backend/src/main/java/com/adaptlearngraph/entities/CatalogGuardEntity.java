package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.catalog_guard: singleton catalog release availability guard. */
@Entity
@Table(schema = "platform", name = "catalog_guard")
@DynamicInsert
@DynamicUpdate
public class CatalogGuardEntity {
    @Id
    @Column(name = "guard_id")
    private Integer guardId;
    @Column(name = "state", nullable = false)
    private String state;
    @Column(name = "intent_id")
    private UUID intentId;
    @Column(name = "release_id")
    private UUID releaseId;
    @Column(name = "source_revision", nullable = false)
    private Long sourceRevision;
    @Column(name = "availability_revision", nullable = false)
    private Long availabilityRevision;
    @Column(name = "manifest_hash", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String manifestHash;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CatalogGuardEntity() {
    }

    @SuppressWarnings("java:S107")
    public CatalogGuardEntity(Integer guardId, String state, UUID intentId, UUID releaseId, Long sourceRevision, Long availabilityRevision, String manifestHash, Instant updatedAt) {
        this.guardId = guardId;
        this.state = state;
        this.intentId = intentId;
        this.releaseId = releaseId;
        this.sourceRevision = sourceRevision;
        this.availabilityRevision = availabilityRevision;
        this.manifestHash = manifestHash;
        this.updatedAt = updatedAt;
    }

    public Integer getGuardId() { return guardId; }
    public String getState() { return state; }
    public UUID getIntentId() { return intentId; }
    public UUID getReleaseId() { return releaseId; }
    public Long getSourceRevision() { return sourceRevision; }
    public Long getAvailabilityRevision() { return availabilityRevision; }
    public String getManifestHash() { return manifestHash; }
    public Instant getUpdatedAt() { return updatedAt; }
}
