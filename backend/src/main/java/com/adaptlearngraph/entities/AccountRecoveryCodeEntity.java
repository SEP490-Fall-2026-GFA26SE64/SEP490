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

/** platform.account_recovery_code; only the code hash is stored. */
@Entity
@Table(schema = "platform", name = "account_recovery_code")
@IdClass(AccountRecoveryCodeEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class AccountRecoveryCodeEntity {
    @Id
    @Column(name = "account_id")
    private UUID accountId;
    @Id
    @Column(name = "code_hash", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String codeHash;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "consumed_at")
    private Instant consumedAt;

    protected AccountRecoveryCodeEntity() {
    }

    public AccountRecoveryCodeEntity(UUID accountId, String codeHash, Instant createdAt) {
        this.accountId = accountId;
        this.codeHash = codeHash;
        this.createdAt = createdAt;
    }

    public UUID getAccountId() { return accountId; }
    public String getCodeHash() { return codeHash; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getConsumedAt() { return consumedAt; }

    public record Key(UUID accountId, String codeHash) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
