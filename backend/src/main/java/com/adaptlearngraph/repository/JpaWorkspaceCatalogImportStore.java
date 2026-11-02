package com.adaptlearngraph.repository;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * JPA adapter for leased catalog-import jobs. Semantics match the former JDBC store: SKIP LOCKED claim, five-minute
 * lease, and completion/retry/failure applied only by the current lease owner of a PENDING job.
 */
public final class JpaWorkspaceCatalogImportStore implements WorkspaceCatalogImportStore {
    private static final Duration LEASE = Duration.ofMinutes(5);
    private final WorkspaceCatalogImportJpaRepository imports;
    private final OrganizationWorkspaceJpaRepository workspaces;
    private final TransactionTemplate transactions;

    public JpaWorkspaceCatalogImportStore(WorkspaceCatalogImportJpaRepository imports, OrganizationWorkspaceJpaRepository workspaces,
            TransactionTemplate transactions) {
        this.imports = imports;
        this.workspaces = workspaces;
        this.transactions = transactions;
    }

    @Override
    public Optional<Job> claim(Instant now) {
        return transactions.execute(status -> {
            var organization = imports.lockNextDue(now);
            if (organization.isEmpty()) return Optional.<Job>empty();
            var claimed = imports.claimed(organization.get()).orElseThrow();
            var job = new Job(claimed.organizationId(), claimed.registrationId(), UUID.randomUUID(), claimed.attempts() + 1,
                    claimed.selectedNodeIds());
            imports.lease(job.organizationId(), job.lease(), now.plus(LEASE), now);
            return Optional.of(job);
        });
    }

    @Override
    public void succeed(Job job, String templateVersion, String templateSha256, int nodes, int relationships, Instant now) {
        transactions.executeWithoutResult(status -> {
            if (imports.succeed(job.organizationId(), job.lease(), templateVersion, templateSha256, nodes, relationships, now) != 1) return;
            workspaces.markReadyIfSubscribed(job.organizationId(), now);
        });
    }

    @Override
    public void retry(Job job, String failureCode, Instant nextAttempt, Instant now) {
        imports.retry(job.organizationId(), job.lease(), failureCode, nextAttempt, now);
    }

    @Override
    public void fail(Job job, String failureCode, Instant now) {
        transactions.executeWithoutResult(status -> {
            if (imports.fail(job.organizationId(), job.lease(), failureCode, now) != 1) return;
            workspaces.markFailed(job.organizationId(), "CATALOG_IMPORT_FAILED");
        });
    }
}
