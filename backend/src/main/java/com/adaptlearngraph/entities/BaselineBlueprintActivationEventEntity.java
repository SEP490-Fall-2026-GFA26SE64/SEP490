package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_blueprint_activation_event: immutable activation pointer history. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_blueprint_activation_event")
@DynamicInsert
public class BaselineBlueprintActivationEventEntity {
    @Id
    @Column(name = "activation_event_id")
    private UUID activationEventId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "job_position_id", nullable = false)
    private String jobPositionId;
    @Column(name = "activation_revision", nullable = false)
    private Long activationRevision;
    @Column(name = "blueprint_id", nullable = false)
    private UUID blueprintId;
    @Column(name = "blueprint_version")
    private Integer blueprintVersion;
    @Column(name = "operation", nullable = false)
    private String operation;
    @Column(name = "actor_id", nullable = false)
    private UUID actorId;
    @Column(name = "reason")
    private String reason;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected BaselineBlueprintActivationEventEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineBlueprintActivationEventEntity(UUID activationEventId, UUID organizationId, String jobPositionId, Long activationRevision, UUID blueprintId, Integer blueprintVersion, String operation, UUID actorId, String reason, Instant occurredAt) {
        this.activationEventId = activationEventId;
        this.organizationId = organizationId;
        this.jobPositionId = jobPositionId;
        this.activationRevision = activationRevision;
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.operation = operation;
        this.actorId = actorId;
        this.reason = reason;
        this.occurredAt = occurredAt;
    }

    public UUID getActivationEventId() { return activationEventId; }
    public UUID getOrganizationId() { return organizationId; }
    public String getJobPositionId() { return jobPositionId; }
    public Long getActivationRevision() { return activationRevision; }
    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public String getOperation() { return operation; }
    public UUID getActorId() { return actorId; }
    public String getReason() { return reason; }
    public Instant getOccurredAt() { return occurredAt; }
}
