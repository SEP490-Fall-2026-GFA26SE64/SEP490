package com.adaptlearngraph.subscription.application.port.out;

import java.time.Instant;
import java.util.Optional;

public interface PaymentGateway {
    void requireConfigured();
    Observation create(CreateRequest request);
    Optional<Observation> query(long orderCode, String verifiedLinkId, String verifiedCurrency);
    Observation verifyWebhook(String payload);

    record CreateRequest(long orderCode, long amount, String planName, Instant expiresAt, String returnUrl, String cancelUrl) {}
    record Observation(long orderCode, String paymentLinkId, Long amount, Long paidAmount,
                       String currency, String status, String reference, String checkoutUrl,
                       Instant providerPaidAt, String source, String payloadDigest) {}
}
