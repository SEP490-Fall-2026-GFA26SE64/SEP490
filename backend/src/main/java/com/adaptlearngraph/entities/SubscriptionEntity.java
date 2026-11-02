package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.subscription: one subscription per organization. */
@Entity
@Table(schema = "platform", name = "subscription")
@DynamicInsert
@DynamicUpdate
public class SubscriptionEntity {
    @Id
    @Column(name = "subscription_id")
    private UUID subscriptionId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Column(name = "revision")
    private Long revision;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected SubscriptionEntity() {
    }

    public UUID getSubscriptionId() { return subscriptionId; }
    public UUID getOrganizationId() { return organizationId; }
    public Long getRevision() { return revision; }
    public Instant getCreatedAt() { return createdAt; }
}
