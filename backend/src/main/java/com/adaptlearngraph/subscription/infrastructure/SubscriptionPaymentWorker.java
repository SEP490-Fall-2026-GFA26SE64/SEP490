package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.subscription.application.PaymentProcessor;
import com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore;
import java.time.Clock;
import org.springframework.scheduling.annotation.Scheduled;

public final class SubscriptionPaymentWorker {
    private final PaymentProcessor processor;
    private final PaymentProcessingStore processing;
    private final Clock clock;
    public SubscriptionPaymentWorker(PaymentProcessor processor,PaymentProcessingStore processing,Clock clock) {
        this.processor=processor; this.processing=processing; this.clock=clock;
    }
    @Scheduled(fixedDelayString="${subscription.worker.delay-ms:1000}")
    public void process() { processor.processNext(); }
    @Scheduled(fixedDelayString="${subscription.worker.reconcile-delay-ms:60000}")
    public void reconcile() { processing.scheduleDue(clock.instant()); }
}
