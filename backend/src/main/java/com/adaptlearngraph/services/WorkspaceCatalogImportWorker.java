package com.adaptlearngraph.services;

import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.repository.WorkspaceCatalogGraphWriter;
import com.adaptlearngraph.repository.WorkspaceCatalogImportStore;
import java.time.Clock;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

/** Copies each provisioned organization's selected platform catalog closure, then lets the workspace become ready. */
public final class WorkspaceCatalogImportWorker {
    public static final int MAX_ATTEMPTS = 5;
    private static final Logger LOG = LoggerFactory.getLogger(WorkspaceCatalogImportWorker.class);
    private final WorkspaceCatalogImportStore store;
    private final PlatformCatalogService catalog;
    private final WorkspaceCatalogGraphWriter writer;
    private final Clock clock;

    public WorkspaceCatalogImportWorker(WorkspaceCatalogImportStore store, PlatformCatalogService catalog,
                                        WorkspaceCatalogGraphWriter writer, Clock clock) {
        this.store = store;
        this.catalog = catalog;
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
            var closure = catalog.closure(job.selectedNodeIds());
            var template = catalog.template().orElseThrow();
            var nodes = closure.nodeIds().stream().map(id -> template.nodes().get(id)).toList();
            writer.copy(job.organizationId().toString(), closure.templateVersion(), nodes, closure.edges());
            store.succeed(job, closure.templateVersion(), closure.templateSha256(), closure.nodeCount(),
                    closure.relationshipCount(), clock.instant());
        } catch (RegistrationFailure failure) {
            if (failure.code() == RegistrationFailure.Code.INVALID_INPUT) store.fail(job, "CATALOG_SELECTION_INVALID", clock.instant());
            else retryOrFail(job, "CATALOG_TEMPLATE_UNAVAILABLE");
        } catch (RuntimeException failure) {
            LOG.warn("Workspace catalog copy failed for organization {} ({})", job.organizationId(), failure.getClass().getSimpleName());
            retryOrFail(job, "CATALOG_COPY_FAILED");
        }
        return true;
    }

    private void retryOrFail(WorkspaceCatalogImportStore.Job job, String code) {
        var now = clock.instant();
        if (job.attempt() >= MAX_ATTEMPTS) store.fail(job, code, now);
        else store.retry(job, code, now.plus(Duration.ofSeconds(Math.min(300, 5L << job.attempt()))), now);
    }
}
