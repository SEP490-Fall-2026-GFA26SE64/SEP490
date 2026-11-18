package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.WorkspaceCatalogGraphWriter;
import com.adaptlearngraph.repository.WorkspaceCatalogImportStore;
import java.time.Clock;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

/** Writes each provisioned organization's imported structure into its graph, then lets the workspace become ready. */
public final class WorkspaceCatalogImportWorker {
    public static final int MAX_ATTEMPTS = 5;
    private static final Logger LOG = LoggerFactory.getLogger(WorkspaceCatalogImportWorker.class);
    private final WorkspaceCatalogImportStore store;
    private final WorkspaceCatalogGraphWriter writer;
    private final Clock clock;

    public WorkspaceCatalogImportWorker(WorkspaceCatalogImportStore store, WorkspaceCatalogGraphWriter writer, Clock clock) {
        this.store = store;
        this.writer = writer;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${workspace.catalog-import.delay-ms:2000}")
    public void process() {
        for (int processed = 0; processed < 10 && processNext(); processed++) {
            // Bounded drain per tick.
        }
    }

    public boolean processNext() {
        var claimed = store.claim(clock.instant());
        if (claimed.isEmpty()) return false;
        var job = claimed.get();
        try {
            var structure = job.structure();
            if (structure == null || structure.isEmpty()) {
                store.succeed(job, null, null, 0, 0, clock.instant());
                return true;
            }
            writer.writeStructure(job.organizationId().toString(), structure, clock.instant());
            store.succeed(job, null, null, structure.nodeCount(), structure.relationshipCount(), clock.instant());
        } catch (RuntimeException failure) {
            LOG.warn("Workspace structure import failed for organization {} ({})", job.organizationId(), failure.getClass().getSimpleName());
            retryOrFail(job, "STRUCTURE_IMPORT_FAILED");
        }
        return true;
    }

    private void retryOrFail(WorkspaceCatalogImportStore.Job job, String code) {
        var now = clock.instant();
        if (job.attempt() >= MAX_ATTEMPTS) store.fail(job, code, now);
        else store.retry(job, code, now.plus(Duration.ofSeconds(Math.min(300, 5L << job.attempt()))), now);
    }
}
