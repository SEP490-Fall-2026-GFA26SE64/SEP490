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

/**
 * platform.baseline_blueprint_activation: compare-and-set current Blueprint pointer per organization and Occupation; the
 * generated {@code state} column is derived by PostgreSQL and the revision rules are enforced by a trigger.
 */
@Entity
@Table(schema = "platform", name = "baseline_blueprint_activation")
@IdClass(BaselineBlueprintActivationEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class BaselineBlueprintActivationEntity {
    @Id
    @Column(name = "organization_id", updatable = false)
    private UUID organizationId;
    @Id
    @Column(name = "occupation_id", updatable = false)
    private String occupationId;
    @Column(name = "blueprint_id", nullable = false, updatable = false)
    private UUID blueprintId;
    @Column(name = "blueprint_version")
    private Integer blueprintVersion;
    @Column(name = "activation_revision", nullable = false)
    private Long activationRevision;
    @Column(name = "state", insertable = false, updatable = false)
    private String state;
    @Column(name = "activated_by", nullable = false)
    private UUID activatedBy;
    @Column(name = "activated_at", nullable = false)
    private Instant activatedAt;

    protected BaselineBlueprintActivationEntity() {
    }

    public BaselineBlueprintActivationEntity(UUID organizationId, String occupationId, UUID blueprintId, Integer blueprintVersion,
            Long activationRevision, UUID activatedBy, Instant activatedAt) {
        this.organizationId = organizationId;
        this.occupationId = occupationId;
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.activationRevision = activationRevision;
        this.activatedBy = activatedBy;
        this.activatedAt = activatedAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public String getOccupationId() { return occupationId; }
    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public Long getActivationRevision() { return activationRevision; }
    public String getState() { return state; }
    public UUID getActivatedBy() { return activatedBy; }
    public Instant getActivatedAt() { return activatedAt; }

    public record Key(UUID organizationId, String occupationId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
