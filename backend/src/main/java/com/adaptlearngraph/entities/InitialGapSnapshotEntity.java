package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.initial_gap_snapshot: frozen role-gap input of an initial pathway request (trigger initial_gap_snapshot_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_gap_snapshot")
@DynamicInsert
public class InitialGapSnapshotEntity {
    @Id
    @Column(name = "gap_snapshot_id")
    private UUID gapSnapshotId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;
    @Column(name = "selection_id", nullable = false)
    private UUID selectionId;
    @Column(name = "selection_revision", nullable = false)
    private Long selectionRevision;
    @Column(name = "job_position_id", nullable = false)
    private String jobPositionId;
    @Column(name = "baseline_attempt_id", nullable = false)
    private UUID baselineAttemptId;
    @Column(name = "gap_input_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String gapInputHash;
    @Column(name = "content_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String contentHash;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot", nullable = false, columnDefinition = "jsonb")
    private String snapshot;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected InitialGapSnapshotEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialGapSnapshotEntity(UUID gapSnapshotId, UUID organizationId, UUID learnerId, UUID selectionId, Long selectionRevision, String jobPositionId, UUID baselineAttemptId, String gapInputHash, String contentHash, String snapshot, Instant createdAt) {
        this.gapSnapshotId = gapSnapshotId;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.selectionId = selectionId;
        this.selectionRevision = selectionRevision;
        this.jobPositionId = jobPositionId;
        this.baselineAttemptId = baselineAttemptId;
        this.gapInputHash = gapInputHash;
        this.contentHash = contentHash;
        this.snapshot = snapshot;
        this.createdAt = createdAt;
    }

    public UUID getGapSnapshotId() { return gapSnapshotId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getSelectionId() { return selectionId; }
    public Long getSelectionRevision() { return selectionRevision; }
    public String getJobPositionId() { return jobPositionId; }
    public UUID getBaselineAttemptId() { return baselineAttemptId; }
    public String getGapInputHash() { return gapInputHash; }
    public String getContentHash() { return contentHash; }
    public String getSnapshot() { return snapshot; }
    public Instant getCreatedAt() { return createdAt; }
}
