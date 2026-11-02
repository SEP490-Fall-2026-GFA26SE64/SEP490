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
import org.hibernate.annotations.Immutable;

/** platform.initial_pathway_approval: expert approval of an exact revision (trigger initial_pathway_approval_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "initial_pathway_approval")
@IdClass(InitialPathwayApprovalEntity.Key.class)
@DynamicInsert
public class InitialPathwayApprovalEntity {
    @Id
    @Column(name = "request_id")
    private UUID requestId;
    @Id
    @Column(name = "revision")
    private Long revision;
    @Column(name = "content_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String contentHash;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "expert_id", nullable = false)
    private UUID expertId;
    @Column(name = "assignment_id", nullable = false)
    private String assignmentId;
    @Column(name = "assignment_version", nullable = false)
    private String assignmentVersion;
    @Column(name = "confirmed_at", nullable = false)
    private Instant confirmedAt;

    protected InitialPathwayApprovalEntity() {
    }

    @SuppressWarnings("java:S107")
    public InitialPathwayApprovalEntity(UUID requestId, Long revision, String contentHash, UUID organizationId, UUID expertId, String assignmentId, String assignmentVersion, Instant confirmedAt) {
        this.requestId = requestId;
        this.revision = revision;
        this.contentHash = contentHash;
        this.organizationId = organizationId;
        this.expertId = expertId;
        this.assignmentId = assignmentId;
        this.assignmentVersion = assignmentVersion;
        this.confirmedAt = confirmedAt;
    }

    public UUID getRequestId() { return requestId; }
    public Long getRevision() { return revision; }
    public String getContentHash() { return contentHash; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getExpertId() { return expertId; }
    public String getAssignmentId() { return assignmentId; }
    public String getAssignmentVersion() { return assignmentVersion; }
    public Instant getConfirmedAt() { return confirmedAt; }

    public record Key(UUID requestId, Long revision) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
