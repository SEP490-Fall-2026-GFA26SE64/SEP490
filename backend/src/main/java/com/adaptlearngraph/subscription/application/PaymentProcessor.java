package com.adaptlearngraph.subscription.application;

import com.adaptlearngraph.subscription.application.port.out.PaymentGateway;
import com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.time.Clock;

public final class PaymentProcessor {
    private final PaymentProcessingStore store;
    private final PaymentGateway gateway;
    private final Clock clock;
    private final String publicUrl;

    public PaymentProcessor(PaymentProcessingStore store, PaymentGateway gateway, Clock clock, String publicUrl) {
        this.store = store;
        this.gateway = gateway;
        this.clock = clock;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
    }

    public void webhook(String payload) { store.record(gateway.verifyWebhook(payload), clock.instant()); }

    public boolean processNext() {
        var next = store.claim(clock.instant());
        if (next.isEmpty()) return false;
        var work = next.get();
        var order = work.order();
        try {
            if ("PAYMENT_APPLY".equals(work.handler())) {
                store.apply(order.orderId(), clock.instant());
            } else if (!"PAID".equals(order.paymentStatus())) {
                var observed = gateway.query(order.providerOrderCode(), order.paymentLinkId(),
                        order.paymentLinkId() == null ? null : order.terms().currency());
                if (observed.isPresent()) {
                    store.record(observed.get(), clock.instant());
                } else if ("PAYMENT_CREATE".equals(work.handler()) && clock.instant().isBefore(order.expiresAt())) {
                    String route = order.organizationId() == null ? "/guest/payment-result" : "/admin/subscription/payment-result";
                    String callback = publicUrl + route + "?order=" + order.orderId();
                    store.record(gateway.create(new PaymentGateway.CreateRequest(order.providerOrderCode(),
                            order.terms().priceVnd(), order.terms().name(), order.expiresAt(), callback, callback)), clock.instant());
                } else {
                    throw new SubscriptionFailure(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE,
                            "The provider has not established a terminal unpaid outcome.");
                }
            }
            store.finish(work, clock.instant());
        } catch (SubscriptionFailure failure) {
            store.retry(work, failure.code().name(), clock.instant());
        }
        return true;
    }
}
