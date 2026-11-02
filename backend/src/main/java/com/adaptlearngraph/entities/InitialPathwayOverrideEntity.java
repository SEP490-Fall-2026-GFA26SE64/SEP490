package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.initial_pathway_override: expert edit history between revisions (trigger initial_pathway_override_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_override")
@DynamicInsert
public class InitialPathwayOverrideEntity {
    @Id
    @Column(name = "override_id")
    private UUID overrideId;
    @Column(name = "request_id", nullable = false)
    private UUID requestId;
    @Column(name = "previous_revision", nullable = false)
    private Long previousRevision;
    @Column(name = "next_revision", nullable = false)
    private Long nextRevision;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "expert_id", nullable = false)
    private UUID expertId;
    @Column(name = "assignment_id", nullable = false)
    private String assignmentId;
    @Column(name = "assignment_version", nullable = false)
    private String assignmentVersion;
    @Column(name = "action", nullable = false)
    private String action;
    @Column(name = "module_id", nullable = false)
    private String moduleId;
    @Column(name = "reason")
    private String reason;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected InitialPathwayOverrideEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayOverrideEntity(UUID overrideId, UUID requestId, Long previousRevision, Long nextRevision, UUID organizationId, UUID expertId, String assignmentId, String assignmentVersion, String action, String moduleId, String reason, Instant createdAt) {
        this.overrideId = overrideId;
        this.requestId = requestId;
        this.previousRevision = previousRevision;
        this.nextRevision = nextRevision;
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.assignmentId = assignmentId;
        this.assignmentVersion = assignmentVersion;
        this.action = action;
        this.moduleId = moduleId;
        this.reason = reason;
        this.createdAt = createdAt;
    }

    public UUID getOverrideId() { return overrideId; }
    public UUID getRequestId() { return requestId; }
    public Long getPreviousRevision() { return previousRevision; }
    public Long getNextRevision() { return nextRevision; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getExpertId() { return expertId; }
    public String getAssignmentId() { return assignmentId; }
    public String getAssignmentVersion() { return assignmentVersion; }
    public String getAction() { return action; }
    public String getModuleId() { return moduleId; }
    public String getReason() { return reason; }
    public Instant getCreatedAt() { return createdAt; }
}
