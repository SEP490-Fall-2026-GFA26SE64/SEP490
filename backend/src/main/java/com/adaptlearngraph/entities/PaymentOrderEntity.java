package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/**
 * platform.payment_order. The plan-terms snapshot is protected by trigger payment_order_snapshot_immutable, so only
 * provider/progress columns change, and only through conditional JPQL updates. provider_order_code comes from the
 * payos_order_code_seq default (omitted on insert).
 */
@Entity
@Table(schema = "platform", name = "payment_order")
@DynamicInsert
@DynamicUpdate
public class PaymentOrderEntity {
    @Id
    @Column(name = "order_id")
    private UUID orderId;
    @Column(name = "intent_id", nullable = false, updatable = false)
    private UUID intentId;
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;
    @Column(name = "attempt", nullable = false, updatable = false)
    private Integer attempt;
    @Column(name = "provider_order_code", insertable = false, updatable = false)
    private Long providerOrderCode;
    @Column(name = "plan_id", nullable = false, updatable = false)
    private UUID planId;
    @Column(name = "plan_version_id", nullable = false, updatable = false)
    private UUID planVersionId;
    @Column(name = "name", nullable = false, updatable = false)
    private String name;
    @Column(name = "description", nullable = false, updatable = false)
    private String description;
    @Column(name = "price_vnd", nullable = false, updatable = false)
    private Long priceVnd;
    @Column(name = "currency", nullable = false, updatable = false)
    private String currency;
    @Column(name = "duration_months", nullable = false, updatable = false)
    private Integer durationMonths;
    @Column(name = "employee_seats", nullable = false, updatable = false)
    private Integer employeeSeats;
    @Column(name = "idempotency_key", nullable = false, updatable = false)
    private UUID idempotencyKey;
    @Column(name = "request_digest", nullable = false, updatable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String requestDigest;
    @Column(name = "payment_status")
    private String paymentStatus;
    @Column(name = "provider_status")
    private String providerStatus;
    @Column(name = "payment_link_id")
    private String paymentLinkId;
    @Column(name = "checkout_url")
    private String checkoutUrl;
    @Column(name = "observed_paid_amount")
    private Long observedPaidAmount;
    @Column(name = "paid_at")
    private Instant paidAt;
    @Column(name = "last_checked_at")
    private Instant lastCheckedAt;
    @Column(name = "failure_code")
    private String failureCode;
    @Column(name = "supersedes_order_id", updatable = false)
    private UUID supersedesOrderId;
    @Column(name = "revision")
    private Long revision;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;
    @Column(name = "development_bypassed_at")
    private Instant developmentBypassedAt;

    protected PaymentOrderEntity() {
    }

    @SuppressWarnings("java:S107")
    public PaymentOrderEntity(UUID orderId, UUID intentId, UUID createdBy, int attempt, UUID planId, UUID planVersionId,
            String name, String description, long priceVnd, String currency, int durationMonths, int employeeSeats,
            UUID idempotencyKey, String requestDigest, UUID supersedesOrderId, Instant createdAt, Instant expiresAt) {
        this.orderId = orderId;
        this.intentId = intentId;
        this.createdBy = createdBy;
        this.attempt = attempt;
        this.planId = planId;
        this.planVersionId = planVersionId;
        this.name = name;
        this.description = description;
        this.priceVnd = priceVnd;
        this.currency = currency;
        this.durationMonths = durationMonths;
        this.employeeSeats = employeeSeats;
        this.idempotencyKey = idempotencyKey;
        this.requestDigest = requestDigest;
        this.supersedesOrderId = supersedesOrderId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public UUID getOrderId() { return orderId; }
    public UUID getIntentId() { return intentId; }
    public UUID getCreatedBy() { return createdBy; }
    public Integer getAttempt() { return attempt; }
    public Long getProviderOrderCode() { return providerOrderCode; }
    public UUID getPlanId() { return planId; }
    public UUID getPlanVersionId() { return planVersionId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Long getPriceVnd() { return priceVnd; }
    public String getCurrency() { return currency; }
    public Integer getDurationMonths() { return durationMonths; }
    public Integer getEmployeeSeats() { return employeeSeats; }
    public UUID getIdempotencyKey() { return idempotencyKey; }
    public String getRequestDigest() { return requestDigest; }
    public String getPaymentStatus() { return paymentStatus; }
    public String getProviderStatus() { return providerStatus; }
    public String getPaymentLinkId() { return paymentLinkId; }
    public String getCheckoutUrl() { return checkoutUrl; }
    public Long getObservedPaidAmount() { return observedPaidAmount; }
    public Instant getPaidAt() { return paidAt; }
    public Instant getLastCheckedAt() { return lastCheckedAt; }
    public String getFailureCode() { return failureCode; }
    public UUID getSupersedesOrderId() { return supersedesOrderId; }
    public Long getRevision() { return revision; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getDevelopmentBypassedAt() { return developmentBypassedAt; }
}
