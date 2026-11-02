package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.registration_email_verification; stores only the code HMAC. */
@Entity
@Table(schema = "platform", name = "registration_email_verification")
@DynamicInsert
@DynamicUpdate
public class RegistrationEmailVerificationEntity {
    @Id
    @Column(name = "account_id")
    private UUID accountId;
    @Column(name = "code_hmac", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String codeHmac;
    @Column(name = "generation", nullable = false)
    private Long generation;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "consumed_at")
    private Instant consumedAt;
    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;
    @Column(name = "window_started_at", nullable = false)
    private Instant windowStartedAt;
    @Column(name = "sends_in_window", nullable = false)
    private Integer sendsInWindow;

    protected RegistrationEmailVerificationEntity() {
    }

    public UUID getAccountId() { return accountId; }
    public String getCodeHmac() { return codeHmac; }
    public Long getGeneration() { return generation; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getConsumedAt() { return consumedAt; }
    public Instant getLastSentAt() { return lastSentAt; }
    public Instant getWindowStartedAt() { return windowStartedAt; }
    public Integer getSendsInWindow() { return sendsInWindow; }
}
