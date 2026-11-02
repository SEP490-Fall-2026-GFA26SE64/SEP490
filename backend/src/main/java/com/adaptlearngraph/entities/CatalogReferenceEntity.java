package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.catalog_reference: immutable confirmed catalog entity/version reference (trigger immutable_history). */
@Entity
@Immutable
@Table(schema = "platform", name = "catalog_reference")
@DynamicInsert
public class CatalogReferenceEntity {
    @Id
    @Column(name = "catalog_ref_id")
    private UUID catalogRefId;
    @Column(name = "entity_id", nullable = false)
    private UUID entityId;
    @Column(name = "version_id", nullable = false)
    private UUID versionId;
    @Column(name = "release_id", nullable = false)
    private UUID releaseId;
    @Column(name = "kind", nullable = false)
    private String kind;
    @Column(name = "source_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String sourceHash;
    @Column(name = "confirmed_at", nullable = false)
    private Instant confirmedAt;

    protected CatalogReferenceEntity() {
    }

    @SuppressWarnings("java:S107")
    public CatalogReferenceEntity(UUID catalogRefId, UUID entityId, UUID versionId, UUID releaseId, String kind, String sourceHash, Instant confirmedAt) {
        this.catalogRefId = catalogRefId;
        this.entityId = entityId;
        this.versionId = versionId;
        this.releaseId = releaseId;
        this.kind = kind;
        this.sourceHash = sourceHash;
        this.confirmedAt = confirmedAt;
    }

    public UUID getCatalogRefId() { return catalogRefId; }
    public UUID getEntityId() { return entityId; }
    public UUID getVersionId() { return versionId; }
    public UUID getReleaseId() { return releaseId; }
    public String getKind() { return kind; }
    public String getSourceHash() { return sourceHash; }
    public Instant getConfirmedAt() { return confirmedAt; }
}
