package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_answer_reveal_audit: append-only record of every answer-key reveal. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_answer_reveal_audit")
@DynamicInsert
public class BaselineAnswerRevealAuditEntity {
    @Id
    @Column(name = "answer_reveal_audit_id")
    private UUID answerRevealAuditId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "assessment_version_id", nullable = false)
    private UUID assessmentVersionId;
    @Column(name = "actor_id", nullable = false)
    private UUID actorId;
    @Column(name = "revealed_at", nullable = false)
    private Instant revealedAt;
    @Column(name = "item_count", nullable = false)
    private Integer itemCount;

    protected BaselineAnswerRevealAuditEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAnswerRevealAuditEntity(UUID answerRevealAuditId, UUID organizationId, UUID assessmentVersionId, UUID actorId, Instant revealedAt, Integer itemCount) {
        this.answerRevealAuditId = answerRevealAuditId;
        this.organizationId = organizationId;
        this.assessmentVersionId = assessmentVersionId;
        this.actorId = actorId;
        this.revealedAt = revealedAt;
        this.itemCount = itemCount;
    }

    public UUID getAnswerRevealAuditId() { return answerRevealAuditId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getAssessmentVersionId() { return assessmentVersionId; }
    public UUID getActorId() { return actorId; }
    public Instant getRevealedAt() { return revealedAt; }
    public Integer getItemCount() { return itemCount; }
}
