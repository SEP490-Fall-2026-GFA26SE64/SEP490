package com.adaptlearngraph.subscription.domain;

import java.time.Instant;
import java.util.UUID;

public record PaymentOrder(UUID orderId, UUID intentId, String kind, UUID registrationId,
                           UUID organizationId, UUID ownerAccountId, UUID planId, UUID planVersionId,
                           PlanTerms terms, long providerOrderCode, String paymentStatus,
                           String paymentLinkId, String checkoutUrl, Long observedPaidAmount,
                           Instant createdAt, Instant expiresAt, Instant confirmedAt,
                           String failureCode, int attempt) {}
