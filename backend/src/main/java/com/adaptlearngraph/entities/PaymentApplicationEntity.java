package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.payment_application: one application outcome per intent (upserted on intent_id). */
@Entity
@Table(schema = "platform", name = "payment_application")
@DynamicInsert
@DynamicUpdate
public class PaymentApplicationEntity {
    @Id
    @Column(name = "application_id")
    private UUID applicationId;
    @Column(name = "order_id", nullable = false)
    private UUID orderId;
    @Column(name = "intent_id", nullable = false)
    private UUID intentId;
    @Column(name = "state", nullable = false)
    private String state;
    @Column(name = "period_id")
    private UUID periodId;
    @Column(name = "applied_at")
    private Instant appliedAt;
    @Column(name = "failure_code")
    private String failureCode;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected PaymentApplicationEntity() {
    }

    public UUID getApplicationId() { return applicationId; }
    public UUID getOrderId() { return orderId; }
    public UUID getIntentId() { return intentId; }
    public String getState() { return state; }
    public UUID getPeriodId() { return periodId; }
    public Instant getAppliedAt() { return appliedAt; }
    public String getFailureCode() { return failureCode; }
    public Instant getUpdatedAt() { return updatedAt; }
}
