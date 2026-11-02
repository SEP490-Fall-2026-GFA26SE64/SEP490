package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.organization. Status changes are explicit commands; the tenant id is the primary key. */
@Entity
@Table(schema = "platform", name = "organization")
@DynamicInsert
@DynamicUpdate
public class OrganizationEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Column(name = "code", nullable = false, updatable = false)
    private String code;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "status")
    private String status;
    @Column(name = "created_at")
    private Instant createdAt;

    protected OrganizationEntity() {
    }

    public OrganizationEntity(UUID organizationId, String code, String name, Instant createdAt) {
        this.organizationId = organizationId;
        this.code = code;
        this.name = name;
        this.createdAt = createdAt;
    }

    public UUID getOrganizationId() { return organizationId; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
