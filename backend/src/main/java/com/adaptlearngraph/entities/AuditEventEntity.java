package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.audit_event: append-only (trigger audit_append_only rejects UPDATE/DELETE), so insert-only here. */
@Entity
@Immutable
@Table(schema = "platform", name = "audit_event")
@DynamicInsert
public class AuditEventEntity {
    @Id
    @Column(name = "audit_event_id")
    private UUID auditEventId;
    @Column(name = "actor_id")
    private UUID actorId;
    @Column(name = "service_name")
    private String serviceName;
    @Column(name = "action", nullable = false)
    private String action;
    @Column(name = "resource_id", nullable = false)
    private UUID resourceId;
    @Column(name = "resource_revision")
    private String resourceRevision;
    @Column(name = "occurred_at")
    private Instant occurredAt;
    @Column(name = "outcome", nullable = false)
    private String outcome;
    @Column(name = "correlation_id", nullable = false)
    private UUID correlationId;

    protected AuditEventEntity() {
    }

    public AuditEventEntity(UUID auditEventId, UUID actorId, String serviceName, String action, UUID resourceId,
            String resourceRevision, Instant occurredAt, String outcome, UUID correlationId) {
        this.auditEventId = auditEventId;
        this.actorId = actorId;
        this.serviceName = serviceName;
        this.action = action;
        this.resourceId = resourceId;
        this.resourceRevision = resourceRevision;
        this.occurredAt = occurredAt;
        this.outcome = outcome;
        this.correlationId = correlationId;
    }

    public UUID getAuditEventId() { return auditEventId; }
    public UUID getActorId() { return actorId; }
    public String getServiceName() { return serviceName; }
    public String getAction() { return action; }
    public UUID getResourceId() { return resourceId; }
    public String getResourceRevision() { return resourceRevision; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getOutcome() { return outcome; }
    public UUID getCorrelationId() { return correlationId; }
}
