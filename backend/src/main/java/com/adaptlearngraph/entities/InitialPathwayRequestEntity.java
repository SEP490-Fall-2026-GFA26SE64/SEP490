package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.initial_pathway_request: frozen initial pathway generation request (trigger initial_request_history_guard). */
@Entity
@Table(schema = "platform", name = "initial_pathway_request")
@DynamicInsert
@DynamicUpdate
public class InitialPathwayRequestEntity {
    @Id
    @Column(name = "request_id")
    private UUID requestId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false, updatable = false)
    private UUID learnerId;
    @Column(name = "selection_id", nullable = false)
    private UUID selectionId;
    @Column(name = "selection_revision", nullable = false)
    private Long selectionRevision;
    @Column(name = "gap_snapshot_id", nullable = false)
    private UUID gapSnapshotId;
    @Column(name = "planning_input_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String planningInputHash;
    @Column(name = "algorithm_version", nullable = false)
    private String algorithmVersion;
    @Column(name = "configuration_version", nullable = false)
    private String configurationVersion;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "frozen_input", nullable = false, columnDefinition = "jsonb")
    private String frozenInput;
    @Column(name = "generation_status", nullable = false)
    private String generationStatus;
    @Column(name = "reason_code")
    private String reasonCode;
    @Column(name = "claim_token")
    private UUID claimToken;
    @Column(name = "claim_worker_version")
    private String claimWorkerVersion;
    @Column(name = "lease_expires_at")
    private Instant leaseExpiresAt;
    @Column(name = "attempts", nullable = false)
    private Integer attempts;
    @Column(name = "next_retry_at", nullable = false)
    private Instant nextRetryAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected InitialPathwayRequestEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayRequestEntity(UUID requestId, UUID organizationId, UUID learnerId, UUID selectionId, Long selectionRevision, UUID gapSnapshotId, String planningInputHash, String algorithmVersion, String configurationVersion, String frozenInput, String generationStatus, String reasonCode, UUID claimToken, String claimWorkerVersion, Instant leaseExpiresAt, Integer attempts, Instant nextRetryAt, Instant createdAt) {
        this.requestId = requestId;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.selectionId = selectionId;
        this.selectionRevision = selectionRevision;
        this.gapSnapshotId = gapSnapshotId;
        this.planningInputHash = planningInputHash;
        this.algorithmVersion = algorithmVersion;
        this.configurationVersion = configurationVersion;
        this.frozenInput = frozenInput;
        this.generationStatus = generationStatus;
        this.reasonCode = reasonCode;
        this.claimToken = claimToken;
        this.claimWorkerVersion = claimWorkerVersion;
        this.leaseExpiresAt = leaseExpiresAt;
        this.attempts = attempts;
        this.nextRetryAt = nextRetryAt;
        this.createdAt = createdAt;
    }

    public UUID getRequestId() { return requestId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getSelectionId() { return selectionId; }
    public Long getSelectionRevision() { return selectionRevision; }
    public UUID getGapSnapshotId() { return gapSnapshotId; }
    public String getPlanningInputHash() { return planningInputHash; }
    public String getAlgorithmVersion() { return algorithmVersion; }
    public String getConfigurationVersion() { return configurationVersion; }
    public String getFrozenInput() { return frozenInput; }
    public String getGenerationStatus() { return generationStatus; }
    public String getReasonCode() { return reasonCode; }
    public UUID getClaimToken() { return claimToken; }
    public String getClaimWorkerVersion() { return claimWorkerVersion; }
    public Instant getLeaseExpiresAt() { return leaseExpiresAt; }
    public Integer getAttempts() { return attempts; }
    public Instant getNextRetryAt() { return nextRetryAt; }
    public Instant getCreatedAt() { return createdAt; }
}
