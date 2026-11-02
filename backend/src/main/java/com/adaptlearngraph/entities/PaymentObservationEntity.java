package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.payment_observation: immutable provider evidence (trigger payment_observation_immutable). */
@Entity
@Immutable
@Table(schema = "platform", name = "payment_observation")
@DynamicInsert
public class PaymentObservationEntity {
    @Id
    @Column(name = "observation_id")
    private UUID observationId;
    @Column(name = "order_id")
    private UUID orderId;
    @Column(name = "provider_order_code", nullable = false)
    private Long providerOrderCode;
    @Column(name = "provider_reference")
    private String providerReference;
    @Column(name = "payment_link_id")
    private String paymentLinkId;
    @Column(name = "amount")
    private Long amount;
    @Column(name = "currency")
    private String currency;
    @Column(name = "observed_status", nullable = false)
    private String observedStatus;
    @Column(name = "payload_digest", nullable = false, columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String payloadDigest;
    @Column(name = "source", nullable = false)
    private String source;
    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
    @Column(name = "provider_paid_at")
    private Instant providerPaidAt;
    @Column(name = "disposition", nullable = false)
    private String disposition;

    protected PaymentObservationEntity() {
    }

    public UUID getObservationId() { return observationId; }
    public UUID getOrderId() { return orderId; }
    public Long getProviderOrderCode() { return providerOrderCode; }
    public String getProviderReference() { return providerReference; }
    public String getPaymentLinkId() { return paymentLinkId; }
    public Long getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getObservedStatus() { return observedStatus; }
    public String getPayloadDigest() { return payloadDigest; }
    public String getSource() { return source; }
    public Instant getReceivedAt() { return receivedAt; }
    public Instant getProviderPaidAt() { return providerPaidAt; }
    public String getDisposition() { return disposition; }
}
