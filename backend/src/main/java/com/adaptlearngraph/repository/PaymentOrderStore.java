package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.PaymentOrder;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PaymentOrderStore {
    PaymentOrder create(SubscriptionIdentity.Context context, Command command, Instant now);
    Optional<PaymentOrder> find(UUID orderId);
    Optional<PaymentOrder> findByProviderCode(long orderCode);
    Optional<PaymentOrder> current(SubscriptionIdentity.Context context, UUID organizationId);
    String applicationState(UUID orderId);
    SeatAddonQuote quoteSeatAddon(SubscriptionIdentity.Context context, UUID organizationId, String target, int seats, Instant now);
    PaymentOrder createSeatAddon(SubscriptionIdentity.Context context, SeatAddonCommand command, Instant now);
    int changeDesiredAddonSeats(SubscriptionIdentity.Context context, UUID organizationId, int desired, int expected, Instant now);

    /** {@code expectedAddonSeats} confirms the add-on seats the client showed for a renewal; null skips the check. */
    record Command(UUID organizationId, UUID planId, UUID expectedVersionId, UUID idempotencyKey, UUID replacesOrderId,
                   Integer expectedAddonSeats) {
        public Command(UUID organizationId, UUID planId, UUID expectedVersionId, UUID idempotencyKey, UUID replacesOrderId) {
            this(organizationId, planId, expectedVersionId, idempotencyKey, replacesOrderId, null);
        }
    }

    /** {@code target} is CURRENT (prorated increase) or SCHEDULED (full-period shortfall of the paid future period). */
    record SeatAddonCommand(UUID organizationId, UUID idempotencyKey, String target, int seats, Long expectedAmountVnd) {}

    record SeatAddonQuote(String target, String kind, UUID periodId, String planName, Instant startsAt, Instant endsAt,
                          int seats, long perSeatVnd, long amountVnd) {}
}
