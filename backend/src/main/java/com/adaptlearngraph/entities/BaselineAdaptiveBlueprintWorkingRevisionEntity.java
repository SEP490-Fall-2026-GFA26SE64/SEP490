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

/** platform.baseline_adaptive_blueprint_working_revision: compare-and-set adaptive Blueprint draft; history guarded by triggers. */
@Entity
@Table(schema = "platform", name = "baseline_adaptive_blueprint_working_revision")
@DynamicInsert
@DynamicUpdate
public class BaselineAdaptiveBlueprintWorkingRevisionEntity {
    @Id
    @Column(name = "working_revision_id")
    private UUID workingRevisionId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "occupation_id", nullable = false, updatable = false)
    private String occupationId;
    @Column(name = "blueprint_id", nullable = false, updatable = false)
    private UUID blueprintId;
    @Column(name = "revision", nullable = false)
    private Long revision;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "configuration", nullable = false, columnDefinition = "jsonb")
    private String configuration;
    @Column(name = "state", nullable = false)
    private String state;
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
    @Column(name = "updated_by", nullable = false)
    private UUID updatedBy;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "closed_at")
    private Instant closedAt;

    protected BaselineAdaptiveBlueprintWorkingRevisionEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAdaptiveBlueprintWorkingRevisionEntity(UUID workingRevisionId, UUID organizationId, String occupationId, UUID blueprintId, Long revision, String configuration, String state, UUID createdBy, Instant createdAt, UUID updatedBy, Instant updatedAt, Instant closedAt) {
        this.workingRevisionId = workingRevisionId;
        this.organizationId = organizationId;
        this.occupationId = occupationId;
        this.blueprintId = blueprintId;
        this.revision = revision;
        this.configuration = configuration;
        this.state = state;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
        this.closedAt = closedAt;
    }

    public UUID getWorkingRevisionId() { return workingRevisionId; }
    public UUID getOrganizationId() { return organizationId; }
    public String getOccupationId() { return occupationId; }
    public UUID getBlueprintId() { return blueprintId; }
    public Long getRevision() { return revision; }
    public String getConfiguration() { return configuration; }
    public String getState() { return state; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getUpdatedBy() { return updatedBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getClosedAt() { return closedAt; }
}
