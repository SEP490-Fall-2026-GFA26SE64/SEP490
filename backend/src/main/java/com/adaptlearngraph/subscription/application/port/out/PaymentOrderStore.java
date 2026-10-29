package com.adaptlearngraph.subscription.application.port.out;

import com.adaptlearngraph.subscription.domain.PaymentOrder;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PaymentOrderStore {
    PaymentOrder create(SubscriptionIdentity.Context context, Command command, Instant now);
    Optional<PaymentOrder> find(UUID orderId);
    Optional<PaymentOrder> findByProviderCode(long orderCode);
    Optional<PaymentOrder> current(SubscriptionIdentity.Context context, UUID organizationId);
    String applicationState(UUID orderId);

    record Command(UUID organizationId, UUID planId, UUID expectedVersionId, UUID idempotencyKey, UUID replacesOrderId) {}
}
