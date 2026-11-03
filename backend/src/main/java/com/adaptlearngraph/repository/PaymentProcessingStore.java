package com.adaptlearngraph.repository;

import com.adaptlearngraph.helper.PaymentGateway;
import com.adaptlearngraph.entities.domain.PaymentOrder;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PaymentProcessingStore {
    Optional<Work> claim(Instant now);
    void record(PaymentGateway.Observation observation, Instant now);
    void apply(UUID orderId, Instant now);
    void bypassForDevelopment(UUID orderId, Instant now);
    void finish(Work work, Instant now);
    void retry(Work work, String failureCode, Instant now);
    void schedule(UUID orderId, Instant now);
    void scheduleDue(Instant now);

    /** Workspace URL slug of an existing organization, if provisioned. */
    default Optional<String> workspaceSlug(UUID organizationId) {
        return Optional.empty();
    }

    record Work(UUID jobId, String lease, String handler, int attempt, PaymentOrder order) {}
}
