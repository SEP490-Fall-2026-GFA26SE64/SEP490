package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.OrganizationStructure;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Durable, leased jobs that write a registration's imported organization structure into its organization graph. */
public interface WorkspaceCatalogImportStore {
    Optional<Job> claim(Instant now);

    /** Marks the import complete and makes the workspace ready once its subscription is active. */
    void succeed(Job job, String templateVersion, String templateSha256, int nodes, int relationships, Instant now);

    void retry(Job job, String failureCode, Instant nextAttempt, Instant now);

    /** Terminal failure; the workspace setup is marked failed instead of becoming ready without its structure. */
    void fail(Job job, String failureCode, Instant now);

    /** {@code structure} is null for a legacy platform-catalog job, which completes without writing anything. */
    record Job(UUID organizationId, UUID registrationId, UUID lease, int attempt, OrganizationStructure structure) {
    }
}
