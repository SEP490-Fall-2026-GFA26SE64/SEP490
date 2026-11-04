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
 * platform.organization_membership. Deferred constraint triggers (role required, employee assignment) validate at
 * commit; organization_id is immutable through JPA.
 */
@Entity
@Table(schema = "platform", name = "organization_membership")
@DynamicInsert
@DynamicUpdate
public class OrganizationMembershipEntity {
    @Id
    @Column(name = "membership_id")
    private UUID membershipId;
    @Column(name = "account_id", nullable = false, updatable = false)
    private UUID accountId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "active", nullable = false)
    private Boolean active;
    @Column(name = "department_id")
    private UUID departmentId;
    @Column(name = "job_position_reference_id")
    private UUID jobPositionReferenceId;
    @Column(name = "revision")
    private Long revision;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected OrganizationMembershipEntity() {
    }

    public OrganizationMembershipEntity(UUID membershipId, UUID accountId, UUID organizationId, boolean active,
            UUID departmentId, UUID jobPositionReferenceId, Instant now) {
        this.membershipId = membershipId;
        this.accountId = accountId;
        this.organizationId = organizationId;
        this.active = active;
        this.departmentId = departmentId;
        this.jobPositionReferenceId = jobPositionReferenceId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getMembershipId() { return membershipId; }
    public UUID getAccountId() { return accountId; }
    public UUID getOrganizationId() { return organizationId; }
    public Boolean getActive() { return active; }
    public UUID getDepartmentId() { return departmentId; }
    public UUID getJobPositionReferenceId() { return jobPositionReferenceId; }
    public Long getRevision() { return revision; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
