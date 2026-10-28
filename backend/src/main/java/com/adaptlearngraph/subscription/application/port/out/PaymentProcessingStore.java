package com.adaptlearngraph.subscription.application.port.out;

import com.adaptlearngraph.subscription.domain.PaymentOrder;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PaymentProcessingStore {
    Optional<Work> claim(Instant now);
    void record(PaymentGateway.Observation observation, Instant now);
    void apply(UUID orderId, Instant now);
    void finish(Work work, Instant now);
    void retry(Work work, String failureCode, Instant now);
    void schedule(UUID orderId, Instant now);
    void scheduleDue(Instant now);

    record Work(UUID jobId, String lease, String handler, int attempt, PaymentOrder order) {}
}
