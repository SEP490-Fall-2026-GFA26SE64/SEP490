package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.subscription_intent: a purchase (by registration) or renewal (by organization) being paid. */
@Entity
@Table(schema = "platform", name = "subscription_intent")
@DynamicInsert
@DynamicUpdate
public class SubscriptionIntentEntity {
    @Id
    @Column(name = "intent_id")
    private UUID intentId;
    @Column(name = "kind", nullable = false, updatable = false)
    private String kind;
    @Column(name = "state")
    private String state;
    @Column(name = "registration_id", updatable = false)
    private UUID registrationId;
    @Column(name = "organization_id", updatable = false)
    private UUID organizationId;
    @Column(name = "owner_account_id", nullable = false, updatable = false)
    private UUID ownerAccountId;
    @Column(name = "applied_order_id")
    private UUID appliedOrderId;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SubscriptionIntentEntity() {
    }

    public SubscriptionIntentEntity(UUID intentId, String kind, UUID registrationId, UUID organizationId, UUID ownerAccountId,
            Instant now) {
        this.intentId = intentId;
        this.kind = kind;
        this.registrationId = registrationId;
        this.organizationId = organizationId;
        this.ownerAccountId = ownerAccountId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getIntentId() { return intentId; }
    public String getKind() { return kind; }
    public String getState() { return state; }
    public UUID getRegistrationId() { return registrationId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getOwnerAccountId() { return ownerAccountId; }
    public UUID getAppliedOrderId() { return appliedOrderId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
