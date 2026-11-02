package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.learning_asset: private uploaded learning file metadata (object key is organization-prefixed). */
@Entity
@Immutable
@Table(schema = "platform", name = "learning_asset")
@DynamicInsert
public class LearningAssetEntity {
    @Id
    @Column(name = "id")
    private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private String organizationId;
    @Column(name = "created_by", nullable = false)
    private String createdBy;
    @Column(name = "object_key", nullable = false)
    private String objectKey;
    @Column(name = "filename", nullable = false)
    private String filename;
    @Column(name = "media_type", nullable = false)
    private String mediaType;
    @Column(name = "byte_size", nullable = false)
    private Long byteSize;
    @Column(name = "sha256", nullable = false)
    private String sha256;
    @Column(name = "duration_seconds")
    private Double durationSeconds;
    @Column(name = "created_at")
    private Instant createdAt;

    protected LearningAssetEntity() {
    }

    @SuppressWarnings("java:S107")
    public LearningAssetEntity(UUID id, String organizationId, String createdBy, String objectKey, String filename, String mediaType, Long byteSize, String sha256, Double durationSeconds, Instant createdAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.createdBy = createdBy;
        this.objectKey = objectKey;
        this.filename = filename;
        this.mediaType = mediaType;
        this.byteSize = byteSize;
        this.sha256 = sha256;
        this.durationSeconds = durationSeconds;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public String getOrganizationId() { return organizationId; }
    public String getCreatedBy() { return createdBy; }
    public String getObjectKey() { return objectKey; }
    public String getFilename() { return filename; }
    public String getMediaType() { return mediaType; }
    public Long getByteSize() { return byteSize; }
    public String getSha256() { return sha256; }
    public Double getDurationSeconds() { return durationSeconds; }
    public Instant getCreatedAt() { return createdAt; }
}
