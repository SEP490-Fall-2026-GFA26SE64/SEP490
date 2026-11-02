package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.outbox_event; written in the same transaction as the business change it announces. */
@Entity
@Table(schema = "platform", name = "outbox_event")
@DynamicInsert
@DynamicUpdate
public class OutboxEventEntity {
    @Id
    @Column(name = "event_id")
    private UUID eventId;
    @Column(name = "event_type", nullable = false, updatable = false)
    private String eventType;
    @Column(name = "aggregate_id", nullable = false, updatable = false)
    private UUID aggregateId;
    @Column(name = "source_revision", nullable = false, updatable = false)
    private Long sourceRevision;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, updatable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;
    @Column(name = "correlation_id", nullable = false, updatable = false)
    private UUID correlationId;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "delivered_at")
    private Instant deliveredAt;

    protected OutboxEventEntity() {
    }

    public OutboxEventEntity(UUID eventId, String eventType, UUID aggregateId, long sourceRevision,
            Map<String, Object> payload, UUID correlationId, Instant createdAt) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.aggregateId = aggregateId;
        this.sourceRevision = sourceRevision;
        this.payload = payload;
        this.correlationId = correlationId;
        this.createdAt = createdAt;
    }

    public UUID getEventId() { return eventId; }
    public String getEventType() { return eventType; }
    public UUID getAggregateId() { return aggregateId; }
    public Long getSourceRevision() { return sourceRevision; }
    public Map<String, Object> getPayload() { return payload; }
    public UUID getCorrelationId() { return correlationId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeliveredAt() { return deliveredAt; }
}
