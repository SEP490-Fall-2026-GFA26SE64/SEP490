package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/**
 * platform.workspace_catalog_import: one leased job per organization. Claim and completion are fenced by
 * lease_owner in conditional updates; this entity is never saved by dirty checking.
 */
@Entity
@Table(schema = "platform", name = "workspace_catalog_import")
@DynamicInsert
@DynamicUpdate
public class WorkspaceCatalogImportEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Column(name = "registration_id", nullable = false, updatable = false)
    private UUID registrationId;
    @Column(name = "state", nullable = false)
    private String state;
    @Column(name = "attempts")
    private Integer attempts;
    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;
    @Column(name = "lease_owner")
    private UUID leaseOwner;
    @Column(name = "lease_until")
    private Instant leaseUntil;
    @Column(name = "template_version")
    private String templateVersion;
    @Column(name = "template_sha256")
    private String templateSha256;
    @Column(name = "node_count")
    private Integer nodeCount;
    @Column(name = "relationship_count")
    private Integer relationshipCount;
    @Column(name = "failure_code")
    private String failureCode;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "completed_at")
    private Instant completedAt;

    protected WorkspaceCatalogImportEntity() {
    }

    public WorkspaceCatalogImportEntity(UUID organizationId, UUID registrationId, Instant now) {
        this.organizationId = organizationId;
        this.registrationId = registrationId;
        this.state = "PENDING";
        this.nextAttemptAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getOrganizationId() { return organizationId; }
    public UUID getRegistrationId() { return registrationId; }
    public String getState() { return state; }
    public Integer getAttempts() { return attempts; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }
    public UUID getLeaseOwner() { return leaseOwner; }
    public Instant getLeaseUntil() { return leaseUntil; }
    public String getTemplateVersion() { return templateVersion; }
    public String getTemplateSha256() { return templateSha256; }
    public Integer getNodeCount() { return nodeCount; }
    public Integer getRelationshipCount() { return relationshipCount; }
    public String getFailureCode() { return failureCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getCompletedAt() { return completedAt; }
}
