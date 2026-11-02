package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.organization_registration; state transitions are conditional JPQL updates in the registration store. */
@Entity
@Table(schema = "platform", name = "organization_registration")
@DynamicInsert
@DynamicUpdate
public class OrganizationRegistrationEntity {
    @Id
    @Column(name = "registration_id")
    private UUID registrationId;
    @Column(name = "account_id", nullable = false, updatable = false)
    private UUID accountId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", insertable = false, updatable = false)
    private AccountEntity account;
    @Column(name = "organization_name", nullable = false)
    private String organizationName;
    @Column(name = "workspace_slug", nullable = false)
    private String workspaceSlug;
    @Column(name = "industry")
    private String industry;
    @Column(name = "headcount")
    private String headcount;
    @Column(name = "admin_name", nullable = false)
    private String adminName;
    @Column(name = "state")
    private String state;
    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;
    @Column(name = "completed_at")
    private Instant completedAt;
    @Column(name = "auth_version")
    private Long authVersion;
    @Column(name = "recovery_required")
    private Boolean recoveryRequired;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "email_verification_bypassed")
    private Boolean emailVerificationBypassed;
    @Column(name = "mfa_bypassed")
    private Boolean mfaBypassed;

    protected OrganizationRegistrationEntity() {
    }

    public UUID getRegistrationId() { return registrationId; }
    public UUID getAccountId() { return accountId; }
    public AccountEntity getAccount() { return account; }
    public String getOrganizationName() { return organizationName; }
    public String getWorkspaceSlug() { return workspaceSlug; }
    public String getIndustry() { return industry; }
    public String getHeadcount() { return headcount; }
    public String getAdminName() { return adminName; }
    public String getState() { return state; }
    public Instant getEmailVerifiedAt() { return emailVerifiedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public Long getAuthVersion() { return authVersion; }
    public Boolean getRecoveryRequired() { return recoveryRequired; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Boolean getEmailVerificationBypassed() { return emailVerificationBypassed; }
    public Boolean getMfaBypassed() { return mfaBypassed; }
}
