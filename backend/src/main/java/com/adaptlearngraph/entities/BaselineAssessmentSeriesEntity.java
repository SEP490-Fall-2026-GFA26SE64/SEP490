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
import org.hibernate.annotations.DynamicUpdate;

/** platform.baseline_assessment_series: per organization occupation pointer to open/active assessment versions. */
@Entity
@Table(schema = "platform", name = "baseline_assessment_series")
@IdClass(BaselineAssessmentSeriesEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class BaselineAssessmentSeriesEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Id
    @Column(name = "occupation_id")
    private String occupationId;
    @Column(name = "blueprint_id", nullable = false)
    private UUID blueprintId;
    @Column(name = "series_revision", nullable = false)
    private Long seriesRevision;
    @Column(name = "working_revision_id")
    private UUID workingRevisionId;
    @Column(name = "pending_blueprint_version")
    private Integer pendingBlueprintVersion;
    @Column(name = "open_assessment_version_id")
    private UUID openAssessmentVersionId;
    @Column(name = "active_assessment_version_id")
    private UUID activeAssessmentVersionId;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BaselineAssessmentSeriesEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAssessmentSeriesEntity(UUID organizationId, String occupationId, UUID blueprintId, Long seriesRevision, UUID workingRevisionId, Integer pendingBlueprintVersion, UUID openAssessmentVersionId, UUID activeAssessmentVersionId, Instant createdAt, Instant updatedAt) {
        this.organizationId = organizationId;
        this.occupationId = occupationId;
        this.blueprintId = blueprintId;
        this.seriesRevision = seriesRevision;
        this.workingRevisionId = workingRevisionId;
        this.pendingBlueprintVersion = pendingBlueprintVersion;
        this.openAssessmentVersionId = openAssessmentVersionId;
        this.activeAssessmentVersionId = activeAssessmentVersionId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public String getOccupationId() { return occupationId; }
    public UUID getBlueprintId() { return blueprintId; }
    public Long getSeriesRevision() { return seriesRevision; }
    public UUID getWorkingRevisionId() { return workingRevisionId; }
    public Integer getPendingBlueprintVersion() { return pendingBlueprintVersion; }
    public UUID getOpenAssessmentVersionId() { return openAssessmentVersionId; }
    public UUID getActiveAssessmentVersionId() { return activeAssessmentVersionId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public record Key(UUID organizationId, String occupationId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
