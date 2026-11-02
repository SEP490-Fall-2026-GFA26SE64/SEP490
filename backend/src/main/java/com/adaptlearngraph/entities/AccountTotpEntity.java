package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.account_totp. The encrypted secret never leaves the persistence/identity boundary. */
@Entity
@Table(schema = "platform", name = "account_totp")
@DynamicInsert
@DynamicUpdate
public class AccountTotpEntity {
    @Id
    @Column(name = "account_id")
    private UUID accountId;
    @Column(name = "encrypted_secret", nullable = false)
    private String encryptedSecret;
    @Column(name = "enabled_at", nullable = false)
    private Instant enabledAt;
    @Column(name = "last_used_step", nullable = false)
    private Long lastUsedStep;

    protected AccountTotpEntity() {
    }

    public UUID getAccountId() { return accountId; }
    public String getEncryptedSecret() { return encryptedSecret; }
    public Instant getEnabledAt() { return enabledAt; }
    public Long getLastUsedStep() { return lastUsedStep; }
}
