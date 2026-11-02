package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.registration_rate_limit, keyed by an HMAC bucket key. */
@Entity
@Table(schema = "platform", name = "registration_rate_limit")
@DynamicInsert
@DynamicUpdate
public class RegistrationRateLimitEntity {
    @Id
    @Column(name = "bucket_key", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String bucketKey;
    @Column(name = "window_started_at", nullable = false)
    private Instant windowStartedAt;
    @Column(name = "attempts", nullable = false)
    private Integer attempts;
    @Column(name = "blocked_until")
    private Instant blockedUntil;

    protected RegistrationRateLimitEntity() {
    }

    public String getBucketKey() { return bucketKey; }
    public Instant getWindowStartedAt() { return windowStartedAt; }
    public Integer getAttempts() { return attempts; }
    public Instant getBlockedUntil() { return blockedUntil; }
}
