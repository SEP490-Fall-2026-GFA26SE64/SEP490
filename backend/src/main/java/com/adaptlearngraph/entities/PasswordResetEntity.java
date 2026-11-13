package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@Table(schema = "platform", name = "password_reset")
@DynamicInsert
@DynamicUpdate
public class PasswordResetEntity {
    @Id
    @Column(name = "reset_id")
    private UUID resetId;

    @Column(name = "account_id", nullable = false, updatable = false)
    private UUID accountId;

    @Column(name = "token_digest", nullable = false, updatable = false)
    private String tokenDigest;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PasswordResetEntity() {}

    public PasswordResetEntity(UUID resetId, UUID accountId, String tokenDigest, Instant expiresAt, Instant createdAt) {
        this.resetId = resetId;
        this.accountId = accountId;
        this.tokenDigest = tokenDigest;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public UUID getResetId() { return resetId; }
    public UUID getAccountId() { return accountId; }
    public String getTokenDigest() { return tokenDigest; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getConsumedAt() { return consumedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public void consume(Instant now) {
        this.consumedAt = now;
    }
}

