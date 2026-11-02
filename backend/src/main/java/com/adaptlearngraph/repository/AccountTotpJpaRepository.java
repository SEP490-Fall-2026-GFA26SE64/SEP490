package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.AccountTotpEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface AccountTotpJpaRepository extends Repository<AccountTotpEntity, UUID> {
    record Credential(String encryptedSecret, Long lastUsedStep) {}

    @Query("select new com.adaptlearngraph.repository.AccountTotpJpaRepository$Credential(t.encryptedSecret, t.lastUsedStep)"
            + " from AccountTotpEntity t where t.accountId = :accountId")
    Optional<Credential> findCredential(@Param("accountId") UUID accountId);

    /** Re-enrolment replaces the secret atomically ({@code ON CONFLICT (account_id) DO UPDATE}). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.account_totp(account_id, encrypted_secret, enabled_at, last_used_step)
            VALUES (:accountId, :secret, :now, :step)
            ON CONFLICT (account_id) DO UPDATE SET encrypted_secret = excluded.encrypted_secret,
                enabled_at = excluded.enabled_at, last_used_step = excluded.last_used_step
            """, nativeQuery = true)
    int upsert(@Param("accountId") UUID accountId, @Param("secret") String encryptedSecret, @Param("now") Instant now,
            @Param("step") long step);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update AccountTotpEntity t set t.lastUsedStep = :step where t.accountId = :accountId")
    int acceptStep(@Param("accountId") UUID accountId, @Param("step") long step);
}
