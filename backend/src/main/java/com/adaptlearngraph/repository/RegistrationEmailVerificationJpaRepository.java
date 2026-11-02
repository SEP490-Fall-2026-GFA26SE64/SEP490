package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.RegistrationEmailVerificationEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface RegistrationEmailVerificationJpaRepository extends Repository<RegistrationEmailVerificationEntity, UUID> {
    record Proof(String hmac, Long generation, Instant expiresAt, Instant consumedAt, Instant lastSentAt,
                 Instant windowStartedAt, Integer sendsInWindow) {}

    @Query("""
            select new com.adaptlearngraph.repository.RegistrationEmailVerificationJpaRepository$Proof(v.codeHmac, v.generation,
                v.expiresAt, v.consumedAt, v.lastSentAt, v.windowStartedAt, v.sendsInWindow)
            from RegistrationEmailVerificationEntity v where v.accountId = :accountId
            """)
    Optional<Proof> findProof(@Param("accountId") UUID accountId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.registration_email_verification(
                account_id, code_hmac, generation, expires_at, consumed_at, last_sent_at, window_started_at, sends_in_window)
            VALUES (:accountId, :hmac, :generation, :expiresAt, :consumedAt, :lastSentAt, :windowStartedAt, :sends)
            ON CONFLICT (account_id) DO UPDATE SET
                code_hmac = excluded.code_hmac, generation = excluded.generation,
                expires_at = excluded.expires_at, consumed_at = excluded.consumed_at,
                last_sent_at = excluded.last_sent_at, window_started_at = excluded.window_started_at,
                sends_in_window = excluded.sends_in_window
            """, nativeQuery = true)
    int upsert(@Param("accountId") UUID accountId, @Param("hmac") String hmac, @Param("generation") long generation,
            @Param("expiresAt") Instant expiresAt, @Param("consumedAt") Instant consumedAt,
            @Param("lastSentAt") Instant lastSentAt, @Param("windowStartedAt") Instant windowStartedAt,
            @Param("sends") int sendsInWindow);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update RegistrationEmailVerificationEntity v set v.consumedAt = :now where v.accountId = :accountId")
    int consume(@Param("accountId") UUID accountId, @Param("now") Instant now);
}
