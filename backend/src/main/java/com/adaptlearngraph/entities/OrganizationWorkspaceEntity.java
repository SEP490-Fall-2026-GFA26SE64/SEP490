package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.organization_workspace: one workspace (slug, setup state) per organization. */
@Entity
@Table(schema = "platform", name = "organization_workspace")
@DynamicInsert
@DynamicUpdate
public class OrganizationWorkspaceEntity {
    @Id
    @Column(name = "workspace_id")
    private UUID workspaceId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "registration_id", nullable = false, updatable = false)
    private UUID registrationId;
    @Column(name = "slug", nullable = false)
    private String slug;
    @Column(name = "setup_state", nullable = false)
    private String setupState;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "ready_at")
    private Instant readyAt;
    @Column(name = "failure_code")
    private String failureCode;

    protected OrganizationWorkspaceEntity() {
    }

    public OrganizationWorkspaceEntity(UUID workspaceId, UUID organizationId, UUID registrationId, String slug, Instant createdAt) {
        this.workspaceId = workspaceId;
        this.organizationId = organizationId;
        this.registrationId = registrationId;
        this.slug = slug;
        this.setupState = "PROVISIONING";
        this.createdAt = createdAt;
    }

    public UUID getWorkspaceId() { return workspaceId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getRegistrationId() { return registrationId; }
    public String getSlug() { return slug; }
    public String getSetupState() { return setupState; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReadyAt() { return readyAt; }
    public String getFailureCode() { return failureCode; }
}
