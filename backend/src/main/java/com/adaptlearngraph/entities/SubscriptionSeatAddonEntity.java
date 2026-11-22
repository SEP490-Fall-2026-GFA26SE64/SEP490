package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/** platform.subscription_seat_addon: immutable Employee seats added to one paid period by one applied order. */
@Entity
@Immutable
@Table(schema = "platform", name = "subscription_seat_addon")
public class SubscriptionSeatAddonEntity {
    @Id
    @Column(name = "addon_id")
    private UUID addonId;
    @Column(name = "subscription_id", nullable = false)
    private UUID subscriptionId;
    @Column(name = "period_id", nullable = false)
    private UUID periodId;
    @Column(name = "order_id", nullable = false)
    private UUID orderId;
    @Column(name = "seats", nullable = false)
    private Integer seats;
    @Column(name = "applied_at", nullable = false)
    private Instant appliedAt;

    protected SubscriptionSeatAddonEntity() {
    }

    public UUID getAddonId() { return addonId; }
    public UUID getSubscriptionId() { return subscriptionId; }
    public UUID getPeriodId() { return periodId; }
    public UUID getOrderId() { return orderId; }
    public Integer getSeats() { return seats; }
    public Instant getAppliedAt() { return appliedAt; }
}
