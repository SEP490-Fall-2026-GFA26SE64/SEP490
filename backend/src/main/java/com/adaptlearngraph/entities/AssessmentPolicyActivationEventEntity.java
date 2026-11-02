package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_assessment_policy_activation_event: immutable activation history. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_assessment_policy_activation_event")
@DynamicInsert
public class AssessmentPolicyActivationEventEntity {
    @Id
    @Column(name = "event_id")
    private UUID eventId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "activation_revision", nullable = false)
    private Long activationRevision;
    @Column(name = "old_policy_version_id")
    private UUID oldPolicyVersionId;
    @Column(name = "new_policy_version_id", nullable = false)
    private UUID newPolicyVersionId;
    @Column(name = "actor_id", nullable = false)
    private UUID actorId;
    @Column(name = "command_key", nullable = false)
    private UUID commandKey;
    @Column(name = "occurred_at")
    private Instant occurredAt;

    protected AssessmentPolicyActivationEventEntity() {
    }

    public AssessmentPolicyActivationEventEntity(UUID eventId, UUID organizationId, long activationRevision, UUID oldPolicyVersionId,
            UUID newPolicyVersionId, UUID actorId, UUID commandKey) {
        this.eventId = eventId;
        this.organizationId = organizationId;
        this.activationRevision = activationRevision;
        this.oldPolicyVersionId = oldPolicyVersionId;
        this.newPolicyVersionId = newPolicyVersionId;
        this.actorId = actorId;
        this.commandKey = commandKey;
    }

    public UUID getEventId() { return eventId; }
    public UUID getOrganizationId() { return organizationId; }
    public Long getActivationRevision() { return activationRevision; }
    public UUID getOldPolicyVersionId() { return oldPolicyVersionId; }
    public UUID getNewPolicyVersionId() { return newPolicyVersionId; }
    public UUID getActorId() { return actorId; }
    public UUID getCommandKey() { return commandKey; }
    public Instant getOccurredAt() { return occurredAt; }
}