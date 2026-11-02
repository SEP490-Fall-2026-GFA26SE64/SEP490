package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.AccountRecoveryCodeEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface AccountRecoveryCodeJpaRepository extends Repository<AccountRecoveryCodeEntity, AccountRecoveryCodeEntity.Key>,
        InsertOnlyRepository<AccountRecoveryCodeEntity> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("delete from AccountRecoveryCodeEntity c where c.accountId = :accountId")
    int deleteByAccount(@Param("accountId") UUID accountId);

    /** Single use: only an unconsumed code of this account is consumed. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update AccountRecoveryCodeEntity c set c.consumedAt = :now
            where c.accountId = :accountId and c.codeHash = :hash and c.consumedAt is null
            """)
    int consume(@Param("accountId") UUID accountId, @Param("hash") String hash, @Param("now") Instant now);
}
