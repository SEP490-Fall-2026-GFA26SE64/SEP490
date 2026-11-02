package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.assessment_version: generated assessment; published versions are frozen by trigger assessment_publication_guard. */
@Entity
@Table(schema = "platform", name = "assessment_version")
@DynamicInsert
@DynamicUpdate
public class AssessmentVersionEntity {
    @Id
    @Column(name = "assessment_version_id")
    private UUID assessmentVersionId;
    @Column(name = "assessment_id", nullable = false)
    private UUID assessmentId;
    @Column(name = "version", nullable = false)
    private Integer version;
    @Column(name = "title", nullable = false)
    private String title;
    @Column(name = "purpose", nullable = false)
    private String purpose;
    @Column(name = "pass_threshold", columnDefinition = PostgresColumnTypes.UNIT_INTERVAL)
    private BigDecimal passThreshold;
    @Column(name = "scoring_version", nullable = false)
    private String scoringVersion;
    @Column(name = "publication_state", nullable = false)
    private String publicationState;
    @Column(name = "content_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String contentHash;
    @Column(name = "blueprint_id")
    private UUID blueprintId;
    @Column(name = "blueprint_version")
    private Integer blueprintVersion;
    @Column(name = "generation_seed")
    private Long generationSeed;
    @Column(name = "created_by")
    private UUID createdBy;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "generation_idempotency_key")
    private String generationIdempotencyKey;
    @Column(name = "generation_request_hash", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String generationRequestHash;
    @Column(name = "reviewed_by")
    private UUID reviewedBy;
    @Column(name = "reviewed_at")
    private Instant reviewedAt;
    @Column(name = "reviewed_content_hash", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String reviewedContentHash;
    @Column(name = "draft_revision", nullable = false)
    private Long draftRevision;
    @Column(name = "baseline_candidate_state")
    private String baselineCandidateState;

    protected AssessmentVersionEntity() {
    }

    @SuppressWarnings("java:S107")
    public AssessmentVersionEntity(UUID assessmentVersionId, UUID assessmentId, Integer version, String title, String purpose, BigDecimal passThreshold, String scoringVersion, String publicationState, String contentHash, UUID blueprintId, Integer blueprintVersion, Long generationSeed, UUID createdBy, Instant createdAt, String generationIdempotencyKey, String generationRequestHash, UUID reviewedBy, Instant reviewedAt, String reviewedContentHash, Long draftRevision, String baselineCandidateState) {
        this.assessmentVersionId = assessmentVersionId;
        this.assessmentId = assessmentId;
        this.version = version;
        this.title = title;
        this.purpose = purpose;
        this.passThreshold = passThreshold;
        this.scoringVersion = scoringVersion;
        this.publicationState = publicationState;
        this.contentHash = contentHash;
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.generationSeed = generationSeed;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.generationIdempotencyKey = generationIdempotencyKey;
        this.generationRequestHash = generationRequestHash;
        this.reviewedBy = reviewedBy;
        this.reviewedAt = reviewedAt;
        this.reviewedContentHash = reviewedContentHash;
        this.draftRevision = draftRevision;
        this.baselineCandidateState = baselineCandidateState;
    }

    public UUID getAssessmentVersionId() { return assessmentVersionId; }
    public UUID getAssessmentId() { return assessmentId; }
    public Integer getVersion() { return version; }
    public String getTitle() { return title; }
    public String getPurpose() { return purpose; }
    public BigDecimal getPassThreshold() { return passThreshold; }
    public String getScoringVersion() { return scoringVersion; }
    public String getPublicationState() { return publicationState; }
    public String getContentHash() { return contentHash; }
    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public Long getGenerationSeed() { return generationSeed; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public String getGenerationIdempotencyKey() { return generationIdempotencyKey; }
    public String getGenerationRequestHash() { return generationRequestHash; }
    public UUID getReviewedBy() { return reviewedBy; }
    public Instant getReviewedAt() { return reviewedAt; }
    public String getReviewedContentHash() { return reviewedContentHash; }
    public Long getDraftRevision() { return draftRevision; }
    public String getBaselineCandidateState() { return baselineCandidateState; }
}
