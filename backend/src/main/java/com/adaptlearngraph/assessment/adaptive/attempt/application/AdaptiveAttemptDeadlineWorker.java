package com.adaptlearngraph.assessment.adaptive.attempt.application;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import java.util.UUID;

/** Bounded organization-only claims; PostgreSQL parent locks are the transaction-scoped lease. */
public final class AdaptiveAttemptDeadlineWorker implements Runnable {
    private static final System.Logger LOG = System.getLogger(AdaptiveAttemptDeadlineWorker.class.getName());
    private final AdaptiveAttemptStore store;
    private final AdaptiveAttemptFinalizationPort finalization;
    private final UUID organizationId;
    private final int batchSize;
    public AdaptiveAttemptDeadlineWorker(AdaptiveAttemptStore store, AdaptiveAttemptFinalizationPort finalization, UUID organizationId, int batchSize) {
        if (organizationId == null || organizationId.equals(new UUID(0, 0)) || batchSize < 1 || batchSize > 100) {
            throw new IllegalArgumentException("Explicit organization and batch size 1..100 required");
        }
        this.store = store; this.finalization = finalization; this.organizationId = organizationId; this.batchSize = batchSize;
    }
    public int runOnce() {
        int[] completed = {0};
        store.withExpired(organizationId, batchSize, attempt -> {
            var next = finalization.finalizeAccepted(attempt);
            store.save(attempt.scope(), attempt.revision(), next);
            completed[0]++;
        });
        return completed[0];
    }
    @Override public void run() {
        try { runOnce(); }
        catch (RuntimeException failure) {
            // The transaction released all claims on rollback; the next bounded poll retries.
            LOG.log(System.Logger.Level.WARNING, "Adaptive baseline deadline batch rolled back; retry on next poll");
        }
    }
}
