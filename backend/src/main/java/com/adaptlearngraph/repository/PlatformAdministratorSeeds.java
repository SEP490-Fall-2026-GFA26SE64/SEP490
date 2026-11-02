package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountEntity;
import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.PlatformAdministratorEntity;
import java.util.Optional;
import java.util.UUID;

/** Persistence for the operator-run platform administrator bootstrap (idempotent, insert-only). */
public final class PlatformAdministratorSeeds {
    private final AccountJpaRepository accounts;
    private final PlatformAdministratorJpaRepository administrators;
    private final AuditEventJpaRepository audit;
    private final PostgresAdvisoryLocks locks;

    public PlatformAdministratorSeeds(AccountJpaRepository accounts, PlatformAdministratorJpaRepository administrators,
            AuditEventJpaRepository audit, PostgresAdvisoryLocks locks) {
        this.accounts = accounts;
        this.administrators = administrators;
        this.audit = audit;
        this.locks = locks;
    }

    public void lock(String normalizedEmail) {
        locks.lock("platform-seed:" + normalizedEmail);
    }

    /** Row-locks ({@code FOR UPDATE}) and returns the existing account with this email, if any. */
    public Optional<AccountJpaRepository.Seed> lockExisting(String normalizedEmail) {
        return accounts.lockByEmail(normalizedEmail).flatMap(accounts::findSeed);
    }

    /** Creates an active platform administrator; timestamps use the database transaction clock as before. */
    public UUID create(String normalizedEmail, String passwordHash) {
        UUID id = UUID.randomUUID();
        accounts.insert(new AccountEntity(id, null, normalizedEmail, normalizedEmail, passwordHash, null));
        administrators.insert(new PlatformAdministratorEntity(id, administrators.databaseNow(), null, "OPERATOR"));
        audit.insert(new AuditEventEntity(UUID.randomUUID(), null, "OPERATOR_BOOTSTRAP", "PLATFORM_ADMINISTRATOR_GRANTED", id,
                null, null, "SUCCEEDED", UUID.randomUUID()));
        return id;
    }
}
