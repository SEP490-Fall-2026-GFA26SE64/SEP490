package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.PasswordResetEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface PasswordResetJpaRepository extends JpaRepository<PasswordResetEntity, UUID> {

    @Query("SELECT p FROM PasswordResetEntity p WHERE p.tokenDigest = :digest AND p.consumedAt IS NULL")
    Optional<PasswordResetEntity> findValidByDigest(@Param("digest") String tokenDigest);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("UPDATE PasswordResetEntity p SET p.consumedAt = :now WHERE p.accountId = :accountId AND p.consumedAt IS NULL")
    int invalidateExistingForAccount(@Param("accountId") UUID accountId, @Param("now") Instant now);
}

