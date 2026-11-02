package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.pathway_revision: legacy published pathway revisions (triggers pathway_content_frozen, pathway_requires_approval). */
@Entity
@Table(schema = "platform", name = "pathway_revision")
@DynamicInsert
@DynamicUpdate
public class PathwayRevisionEntity {
    @Id
    @Column(name = "pathway_revision_id")
    private UUID pathwayRevisionId;
    @Column(name = "pathway_id", nullable = false)
    private UUID pathwayId;
    @Column(name = "recommendation_run_id", nullable = false)
    private UUID recommendationRunId;
    @Column(name = "learner_id", nullable = false, updatable = false)
    private UUID learnerId;
    @Column(name = "selection_id", nullable = false)
    private UUID selectionId;
    @Column(name = "revision", nullable = false)
    private Integer revision;
    @Column(name = "content_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String contentHash;
    @Column(name = "status", nullable = false)
    private String status;
    @Column(name = "validation_status", nullable = false)
    private String validationStatus;
    @Column(name = "published_at")
    private Instant publishedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected PathwayRevisionEntity() {
    }

    @SuppressWarnings("java:S107")
    public PathwayRevisionEntity(UUID pathwayRevisionId, UUID pathwayId, UUID recommendationRunId, UUID learnerId, UUID selectionId, Integer revision, String contentHash, String status, String validationStatus, Instant publishedAt, Instant createdAt) {
        this.pathwayRevisionId = pathwayRevisionId;
        this.pathwayId = pathwayId;
        this.recommendationRunId = recommendationRunId;
        this.learnerId = learnerId;
        this.selectionId = selectionId;
        this.revision = revision;
        this.contentHash = contentHash;
        this.status = status;
        this.validationStatus = validationStatus;
        this.publishedAt = publishedAt;
        this.createdAt = createdAt;
    }

    public UUID getPathwayRevisionId() { return pathwayRevisionId; }
    public UUID getPathwayId() { return pathwayId; }
    public UUID getRecommendationRunId() { return recommendationRunId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getSelectionId() { return selectionId; }
    public Integer getRevision() { return revision; }
    public String getContentHash() { return contentHash; }
    public String getStatus() { return status; }
    public String getValidationStatus() { return validationStatus; }
    public Instant getPublishedAt() { return publishedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
