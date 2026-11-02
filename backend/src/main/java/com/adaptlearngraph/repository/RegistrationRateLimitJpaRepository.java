package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.RegistrationRateLimitEntity;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface RegistrationRateLimitJpaRepository extends Repository<RegistrationRateLimitEntity, String> {
    record Bucket(Instant windowStartedAt, Integer attempts, Instant blockedUntil) {}

    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.registration_rate_limit(bucket_key, window_started_at, attempts)
            VALUES (:key, :now, 0) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("key") String key, @Param("now") Instant now);

    /** Row lock with the former plain {@code FOR UPDATE} semantics. */
    @Query(value = "SELECT bucket_key FROM platform.registration_rate_limit WHERE bucket_key = :key FOR UPDATE",
            nativeQuery = true)
    Optional<String> lock(@Param("key") String key);

    @Query("""
            select new com.adaptlearngraph.repository.RegistrationRateLimitJpaRepository$Bucket(b.windowStartedAt, b.attempts,
                b.blockedUntil) from RegistrationRateLimitEntity b where b.bucketKey = :key
            """)
    Optional<Bucket> findBucket(@Param("key") String key);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update RegistrationRateLimitEntity b set b.windowStartedAt = :windowStartedAt, b.attempts = :attempts,
                b.blockedUntil = :blockedUntil where b.bucketKey = :key
            """)
    int save(@Param("key") String key, @Param("windowStartedAt") Instant windowStartedAt, @Param("attempts") int attempts,
            @Param("blockedUntil") Instant blockedUntil);
}
