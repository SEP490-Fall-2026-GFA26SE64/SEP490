package com.adaptlearngraph.repository;

import jakarta.persistence.EntityManager;

/**
 * Transaction-scoped PostgreSQL advisory locks. JPA has no equivalent, so this stays a native statement on the
 * caller's JPA EntityManager; the lock is released by the enclosing JPA transaction's commit/rollback.
 */
public final class PostgresAdvisoryLocks {
    private final EntityManager entityManager;

    public PostgresAdvisoryLocks(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    /** {@code pg_advisory_xact_lock(hashtextextended(key, 0))}; requires an active transaction. */
    public void lock(String key) {
        entityManager.createNativeQuery("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtextextended(?1, 0))) l")
                .setParameter(1, key).getSingleResult();
    }
}
