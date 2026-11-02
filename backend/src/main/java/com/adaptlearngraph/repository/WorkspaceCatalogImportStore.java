package com.adaptlearngraph.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Durable, leased jobs that copy a registration's platform catalog selection into its organization. */
public interface WorkspaceCatalogImportStore {
    Optional<Job> claim(Instant now);

    /** Marks the copy complete and makes the workspace ready once its subscription is active. */
    void succeed(Job job, String templateVersion, String templateSha256, int nodes, int relationships, Instant now);

    void retry(Job job, String failureCode, Instant nextAttempt, Instant now);

    /** Terminal failure; the workspace setup is marked failed instead of becoming ready without its catalog. */
    void fail(Job job, String failureCode, Instant now);

    record Job(UUID organizationId, UUID registrationId, UUID lease, int attempt, List<String> selectedNodeIds) {
        public Job {
            selectedNodeIds = List.copyOf(selectedNodeIds);
        }
    }
}
