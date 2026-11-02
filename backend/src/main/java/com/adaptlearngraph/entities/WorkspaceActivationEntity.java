package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.workspace_activation: a pending, single-use member invitation (only the proof hash is stored). */
@Entity
@Table(schema = "platform", name = "workspace_activation")
@DynamicInsert
@DynamicUpdate
public class WorkspaceActivationEntity {
    @Id
    @Column(name = "activation_id")
    private UUID activationId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;
    @Column(name = "full_name", nullable = false, updatable = false)
    private String fullName;
    @Column(name = "email", nullable = false, updatable = false)
    private String email;
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "roles", nullable = false, updatable = false, columnDefinition = "text[]")
    private List<String> roles;
    @Column(name = "department_id", updatable = false)
    private UUID departmentId;
    @Column(name = "occupation_reference_id", updatable = false)
    private UUID occupationReferenceId;
    @Column(name = "proof_hash", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String proofHash;
    @Column(name = "generation", nullable = false)
    private Long generation;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;
    @Column(name = "consumed_at")
    private Instant consumedAt;
    @Column(name = "account_id")
    private UUID accountId;

    protected WorkspaceActivationEntity() {
    }

    public WorkspaceActivationEntity(UUID activationId, UUID organizationId, UUID createdBy, String fullName, String email,
            List<String> roles, UUID departmentId, UUID occupationReferenceId, String proofHash, Instant expiresAt, Instant now) {
        this.activationId = activationId;
        this.organizationId = organizationId;
        this.createdBy = createdBy;
        this.fullName = fullName;
        this.email = email;
        this.roles = List.copyOf(roles);
        this.departmentId = departmentId;
        this.occupationReferenceId = occupationReferenceId;
        this.proofHash = proofHash;
        this.generation = 1L;
        this.expiresAt = expiresAt;
        this.createdAt = now;
        this.lastSentAt = now;
    }

    public UUID getActivationId() { return activationId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getCreatedBy() { return createdBy; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public List<String> getRoles() { return roles; }
    public UUID getDepartmentId() { return departmentId; }
    public UUID getOccupationReferenceId() { return occupationReferenceId; }
    public String getProofHash() { return proofHash; }
    public Long getGeneration() { return generation; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastSentAt() { return lastSentAt; }
    public Instant getConsumedAt() { return consumedAt; }
    public UUID getAccountId() { return accountId; }
}
