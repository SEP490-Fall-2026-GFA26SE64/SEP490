package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.baseline_assessment_policy_activation: current policy pointer per organization (revision-fenced). */
@Entity
@Table(schema = "platform", name = "baseline_assessment_policy_activation")
@DynamicInsert
@DynamicUpdate
public class AssessmentPolicyActivationEntity {
    @Id
    @Column(name = "organization_id")
    private UUID organizationId;
    @Column(name = "revision")
    private Long revision;
    @Column(name = "current_policy_version_id")
    private UUID currentPolicyVersionId;
    @Column(name = "changed_by")
    private UUID changedBy;
    @Column(name = "changed_at")
    private Instant changedAt;

    protected AssessmentPolicyActivationEntity() {
    }

    public UUID getOrganizationId() { return organizationId; }
    public Long getRevision() { return revision; }
    public UUID getCurrentPolicyVersionId() { return currentPolicyVersionId; }
    public UUID getChangedBy() { return changedBy; }
    public Instant getChangedAt() { return changedAt; }
}