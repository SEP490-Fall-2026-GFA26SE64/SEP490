package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_assessment_transition: append-only lifecycle history of one baseline assessment series. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_assessment_transition")
@DynamicInsert
public class BaselineAssessmentTransitionEntity {
    @Id
    @Column(name = "transition_id")
    private UUID transitionId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "job_position_id", nullable = false)
    private String jobPositionId;
    @Column(name = "series_revision", nullable = false)
    private Long seriesRevision;
    @Column(name = "transition", nullable = false)
    private String transition;
    @Column(name = "actor_id", nullable = false)
    private UUID actorId;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
    @Column(name = "reason")
    private String reason;
    @Column(name = "previous_working_revision_id")
    private UUID previousWorkingRevisionId;
    @Column(name = "previous_pending_blueprint_id")
    private UUID previousPendingBlueprintId;
    @Column(name = "previous_pending_blueprint_version")
    private Integer previousPendingBlueprintVersion;
    @Column(name = "previous_open_assessment_version_id")
    private UUID previousOpenAssessmentVersionId;
    @Column(name = "previous_active_assessment_version_id")
    private UUID previousActiveAssessmentVersionId;
    @Column(name = "working_revision_id")
    private UUID workingRevisionId;
    @Column(name = "pending_blueprint_id")
    private UUID pendingBlueprintId;
    @Column(name = "pending_blueprint_version")
    private Integer pendingBlueprintVersion;
    @Column(name = "open_assessment_version_id")
    private UUID openAssessmentVersionId;
    @Column(name = "active_assessment_version_id")
    private UUID activeAssessmentVersionId;

    protected BaselineAssessmentTransitionEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAssessmentTransitionEntity(UUID transitionId, UUID organizationId, String jobPositionId, Long seriesRevision, String transition, UUID actorId, Instant occurredAt, String reason, UUID previousWorkingRevisionId, UUID previousPendingBlueprintId, Integer previousPendingBlueprintVersion, UUID previousOpenAssessmentVersionId, UUID previousActiveAssessmentVersionId, UUID workingRevisionId, UUID pendingBlueprintId, Integer pendingBlueprintVersion, UUID openAssessmentVersionId, UUID activeAssessmentVersionId) {
        this.transitionId = transitionId;
        this.organizationId = organizationId;
        this.jobPositionId = jobPositionId;
        this.seriesRevision = seriesRevision;
        this.transition = transition;
        this.actorId = actorId;
        this.occurredAt = occurredAt;
        this.reason = reason;
        this.previousWorkingRevisionId = previousWorkingRevisionId;
        this.previousPendingBlueprintId = previousPendingBlueprintId;
        this.previousPendingBlueprintVersion = previousPendingBlueprintVersion;
        this.previousOpenAssessmentVersionId = previousOpenAssessmentVersionId;
        this.previousActiveAssessmentVersionId = previousActiveAssessmentVersionId;
        this.workingRevisionId = workingRevisionId;
        this.pendingBlueprintId = pendingBlueprintId;
        this.pendingBlueprintVersion = pendingBlueprintVersion;
        this.openAssessmentVersionId = openAssessmentVersionId;
        this.activeAssessmentVersionId = activeAssessmentVersionId;
    }

    public UUID getTransitionId() { return transitionId; }
    public UUID getOrganizationId() { return organizationId; }
    public String getJobPositionId() { return jobPositionId; }
    public Long getSeriesRevision() { return seriesRevision; }
    public String getTransition() { return transition; }
    public UUID getActorId() { return actorId; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getReason() { return reason; }
    public UUID getPreviousWorkingRevisionId() { return previousWorkingRevisionId; }
    public UUID getPreviousPendingBlueprintId() { return previousPendingBlueprintId; }
    public Integer getPreviousPendingBlueprintVersion() { return previousPendingBlueprintVersion; }
    public UUID getPreviousOpenAssessmentVersionId() { return previousOpenAssessmentVersionId; }
    public UUID getPreviousActiveAssessmentVersionId() { return previousActiveAssessmentVersionId; }
    public UUID getWorkingRevisionId() { return workingRevisionId; }
    public UUID getPendingBlueprintId() { return pendingBlueprintId; }
    public Integer getPendingBlueprintVersion() { return pendingBlueprintVersion; }
    public UUID getOpenAssessmentVersionId() { return openAssessmentVersionId; }
    public UUID getActiveAssessmentVersionId() { return activeAssessmentVersionId; }
}
