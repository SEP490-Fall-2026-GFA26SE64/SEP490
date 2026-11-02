package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.subscription_period: immutable billing history (trigger subscription_period_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "subscription_period")
@DynamicInsert
public class SubscriptionPeriodEntity {
    @Id
    @Column(name = "period_id")
    private UUID periodId;
    @Column(name = "subscription_id", nullable = false)
    private UUID subscriptionId;
    @Column(name = "order_id", nullable = false)
    private UUID orderId;
    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;
    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;
    @Column(name = "billing_zone", nullable = false)
    private String billingZone;
    @Column(name = "anniversary_day", nullable = false)
    private Integer anniversaryDay;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected SubscriptionPeriodEntity() {
    }

    public UUID getPeriodId() { return periodId; }
    public UUID getSubscriptionId() { return subscriptionId; }
    public UUID getOrderId() { return orderId; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public String getBillingZone() { return billingZone; }
    public Integer getAnniversaryDay() { return anniversaryDay; }
    public Instant getCreatedAt() { return createdAt; }
}
