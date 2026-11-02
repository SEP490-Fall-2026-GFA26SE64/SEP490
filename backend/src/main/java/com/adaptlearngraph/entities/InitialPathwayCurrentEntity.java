package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.initial_pathway_current: current review pointer of an initial pathway request. */
@Entity
@Table(schema = "platform", name = "initial_pathway_current")
@DynamicInsert
@DynamicUpdate
public class InitialPathwayCurrentEntity {
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
    @Column(name = "current_revision")
    private Long currentRevision;
    @Column(name = "review_status", nullable = false)
    private String reviewStatus;
    @Column(name = "archived_at")
    private Instant archivedAt;

    protected InitialPathwayCurrentEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayCurrentEntity(UUID requestId, UUID organizationId, UUID learnerId, UUID selectionId, Long selectionRevision, Long currentRevision, String reviewStatus, Instant archivedAt) {
        this.requestId = requestId;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.selectionId = selectionId;
        this.selectionRevision = selectionRevision;
        this.currentRevision = currentRevision;
        this.reviewStatus = reviewStatus;
        this.archivedAt = archivedAt;
    }

    public UUID getRequestId() { return requestId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public UUID getSelectionId() { return selectionId; }
    public Long getSelectionRevision() { return selectionRevision; }
    public Long getCurrentRevision() { return currentRevision; }
    public String getReviewStatus() { return reviewStatus; }
    public Instant getArchivedAt() { return archivedAt; }
}
