package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_blueprint: immutable stable Blueprint identity per organization and Occupation. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_blueprint")
@DynamicInsert
public class BaselineBlueprintEntity {
    @Id
    @Column(name = "blueprint_id")
    private UUID blueprintId;
    @Column(name = "occupation_id")
    private String occupationId;
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "organization_id")
    private UUID organizationId;

    protected BaselineBlueprintEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineBlueprintEntity(UUID blueprintId, String occupationId, UUID createdBy, Instant createdAt, UUID organizationId) {
        this.blueprintId = blueprintId;
        this.occupationId = occupationId;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.organizationId = organizationId;
    }

    public UUID getBlueprintId() { return blueprintId; }
    public String getOccupationId() { return occupationId; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getOrganizationId() { return organizationId; }
}
