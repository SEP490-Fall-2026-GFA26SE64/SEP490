package com.adaptlearngraph.entities.domain;

import java.time.Instant;
import java.util.UUID;

public record PaymentOrder(UUID orderId, UUID intentId, String kind, UUID registrationId,
                           UUID organizationId, UUID ownerAccountId, UUID planId, UUID planVersionId,
                           PlanTerms terms, long providerOrderCode, String paymentStatus,
                           String paymentLinkId, String checkoutUrl, Long observedPaidAmount,
                           Instant createdAt, Instant expiresAt, Instant confirmedAt,
                           String failureCode, int attempt, int addonSeats, long addonAmountVnd,
                           String seatAddonKind, UUID targetPeriodId) {
    public PaymentOrder(UUID orderId, UUID intentId, String kind, UUID registrationId,
                        UUID organizationId, UUID ownerAccountId, UUID planId, UUID planVersionId,
                        PlanTerms terms, long providerOrderCode, String paymentStatus,
                        String paymentLinkId, String checkoutUrl, Long observedPaidAmount,
                        Instant createdAt, Instant expiresAt, Instant confirmedAt,
                        String failureCode, int attempt) {
        this(orderId, intentId, kind, registrationId, organizationId, ownerAccountId, planId, planVersionId, terms,
                providerOrderCode, paymentStatus, paymentLinkId, checkoutUrl, observedPaidAmount, createdAt, expiresAt,
                confirmedAt, failureCode, attempt, 0, 0L, null, null);
    }
}
