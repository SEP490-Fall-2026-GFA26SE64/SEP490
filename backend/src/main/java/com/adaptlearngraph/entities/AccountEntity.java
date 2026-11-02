package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.account. organization_id is never updated through JPA (guarded by account_role_boundary). */
@Entity
@Table(schema = "platform", name = "account")
@DynamicInsert
@DynamicUpdate
public class AccountEntity {
    @Id
    @Column(name = "account_id")
    private UUID accountId;
    @Column(name = "unit_id")
    private UUID unitId;
    @Column(name = "identifier", nullable = false)
    private String identifier;
    @Column(name = "normalized_identifier", nullable = false)
    private String normalizedIdentifier;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "active")
    private Boolean active;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "organization_id", updatable = false)
    private UUID organizationId;

    protected AccountEntity() {
    }

    public AccountEntity(UUID accountId, UUID organizationId, String identifier, String normalizedIdentifier,
            String passwordHash, Instant createdAt) {
        this.accountId = accountId;
        this.organizationId = organizationId;
        this.identifier = identifier;
        this.normalizedIdentifier = normalizedIdentifier;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }

    public UUID getAccountId() { return accountId; }
    public UUID getUnitId() { return unitId; }
    public String getIdentifier() { return identifier; }
    public String getNormalizedIdentifier() { return normalizedIdentifier; }
    public String getPasswordHash() { return passwordHash; }
    public Boolean getActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public UUID getOrganizationId() { return organizationId; }
}
