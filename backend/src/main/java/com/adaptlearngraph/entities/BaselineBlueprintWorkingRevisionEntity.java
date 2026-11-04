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

/** platform.baseline_blueprint_working_revision: fixed Blueprint working revision of one organization JobPosition series; closed revisions are frozen by trigger. */
@Entity
@Table(schema = "platform", name = "baseline_blueprint_working_revision")
@DynamicInsert
@DynamicUpdate
public class BaselineBlueprintWorkingRevisionEntity {
    @Id
    @Column(name = "working_revision_id")
    private UUID workingRevisionId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "job_position_id", nullable = false, updatable = false)
    private String jobPositionId;
    @Column(name = "blueprint_id", nullable = false, updatable = false)
    private UUID blueprintId;
    @Column(name = "base_version")
    private Integer baseVersion;
    @Column(name = "revision", nullable = false)
    private Long revision;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "job_position_name_snapshot", nullable = false)
    private String jobPositionNameSnapshot;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "roles", nullable = false, columnDefinition = "jsonb")
    private String roles;
    @Column(name = "state", nullable = false)
    private String state;
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_by", nullable = false)
    private UUID updatedBy;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "closed_at")
    private Instant closedAt;

    protected BaselineBlueprintWorkingRevisionEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineBlueprintWorkingRevisionEntity(UUID workingRevisionId, UUID organizationId, String jobPositionId, UUID blueprintId, Integer baseVersion, Long revision, String name, String jobPositionNameSnapshot, String roles, String state, UUID createdBy, Instant createdAt, UUID updatedBy, Instant updatedAt, Instant closedAt) {
        this.workingRevisionId = workingRevisionId;
        this.organizationId = organizationId;
        this.jobPositionId = jobPositionId;
        this.blueprintId = blueprintId;
        this.baseVersion = baseVersion;
        this.revision = revision;
        this.name = name;
        this.jobPositionNameSnapshot = jobPositionNameSnapshot;
        this.roles = roles;
        this.state = state;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
        this.closedAt = closedAt;
    }

    public UUID getWorkingRevisionId() { return workingRevisionId; }
    public UUID getOrganizationId() { return organizationId; }
    public String getJobPositionId() { return jobPositionId; }
    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBaseVersion() { return baseVersion; }
    public Long getRevision() { return revision; }
    public String getName() { return name; }
    public String getJobPositionNameSnapshot() { return jobPositionNameSnapshot; }
    public String getRoles() { return roles; }
    public String getState() { return state; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getUpdatedBy() { return updatedBy; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getClosedAt() { return closedAt; }
}
