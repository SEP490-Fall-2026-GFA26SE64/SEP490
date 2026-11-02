package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.workspace_account_profile for invited members (registered owners keep their registration row). */
@Entity
@Table(schema = "platform", name = "workspace_account_profile")
@DynamicInsert
@DynamicUpdate
public class WorkspaceAccountProfileEntity {
    @Id
    @Column(name = "account_id")
    private UUID accountId;
    @Column(name = "full_name", nullable = false)
    private String fullName;
    @Column(name = "email_verified_at", nullable = false)
    private Instant emailVerifiedAt;
    @Column(name = "auth_version")
    private Long authVersion;
    @Column(name = "recovery_required")
    private Boolean recoveryRequired;

    protected WorkspaceAccountProfileEntity() {
    }

    public WorkspaceAccountProfileEntity(UUID accountId, String fullName, Instant emailVerifiedAt) {
        this.accountId = accountId;
        this.fullName = fullName;
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public UUID getAccountId() { return accountId; }
    public String getFullName() { return fullName; }
    public Instant getEmailVerifiedAt() { return emailVerifiedAt; }
    public Long getAuthVersion() { return authVersion; }
    public Boolean getRecoveryRequired() { return recoveryRequired; }
}
