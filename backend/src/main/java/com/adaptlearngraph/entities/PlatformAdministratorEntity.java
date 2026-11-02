package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.platform_administrator; guard_role_boundary keeps platform and organization roles disjoint. */
@Entity
@Table(schema = "platform", name = "platform_administrator")
@DynamicInsert
@DynamicUpdate
public class PlatformAdministratorEntity {
    @Id
    @Column(name = "account_id")
    private UUID accountId;
    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;
    @Column(name = "granted_by")
    private UUID grantedBy;
    @Column(name = "grant_source", nullable = false)
    private String grantSource;

    protected PlatformAdministratorEntity() {
    }

    public PlatformAdministratorEntity(UUID accountId, Instant grantedAt, UUID grantedBy, String grantSource) {
        this.accountId = accountId;
        this.grantedAt = grantedAt;
        this.grantedBy = grantedBy;
        this.grantSource = grantSource;
    }

    public UUID getAccountId() { return accountId; }
    public Instant getGrantedAt() { return grantedAt; }
    public UUID getGrantedBy() { return grantedBy; }
    public String getGrantSource() { return grantSource; }
}
