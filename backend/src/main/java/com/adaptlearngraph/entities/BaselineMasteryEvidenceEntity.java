package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_mastery_evidence: immutable baseline mastery initialization evidence (trigger evidence_assessment_policy_insert). */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_mastery_evidence")
@IdClass(BaselineMasteryEvidenceEntity.Key.class)
@DynamicInsert
public class BaselineMasteryEvidenceEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;
    @Column(name = "job_position_id", nullable = false)
    private String jobPositionId;
    @Id
    @Column(name = "micro_skill_id")
    private String microSkillId;
    @Column(name = "model_version_id", nullable = false)
    private UUID modelVersionId;
    @Column(name = "mastery_mapping_version_id", nullable = false)
    private UUID masteryMappingVersionId;
    @Column(name = "parameter_set_id", nullable = false)
    private UUID parameterSetId;
    @Column(name = "theta", nullable = false)
    private BigDecimal theta;
    @Column(name = "standard_error", nullable = false)
    private BigDecimal standardError;
    @Column(name = "estimated_mastery", nullable = false, columnDefinition = PostgresColumnTypes.UNIT_INTERVAL)
    private BigDecimal estimatedMastery;
    @Column(name = "mastery", nullable = false, columnDefinition = PostgresColumnTypes.UNIT_INTERVAL)
    private BigDecimal mastery;
    @Column(name = "confidence_label", nullable = false)
    private String confidenceLabel;
    @Column(name = "mastery_event_id", nullable = false)
    private UUID masteryEventId;
    @Column(name = "emitted_at", nullable = false)
    private Instant emittedAt;
    @Column(name = "policy_version_id")
    private UUID policyVersionId;
    @Column(name = "policy_hash", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String policyHash;

    protected BaselineMasteryEvidenceEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineMasteryEvidenceEntity(UUID attemptId, UUID organizationId, UUID learnerId, String jobPositionId, String microSkillId, UUID modelVersionId, UUID masteryMappingVersionId, UUID parameterSetId, BigDecimal theta, BigDecimal standardError, BigDecimal estimatedMastery, BigDecimal mastery, String confidenceLabel, UUID masteryEventId, Instant emittedAt, UUID policyVersionId, String policyHash) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.jobPositionId = jobPositionId;
        this.microSkillId = microSkillId;
        this.modelVersionId = modelVersionId;
        this.masteryMappingVersionId = masteryMappingVersionId;
        this.parameterSetId = parameterSetId;
        this.theta = theta;
        this.standardError = standardError;
        this.estimatedMastery = estimatedMastery;
        this.mastery = mastery;
        this.confidenceLabel = confidenceLabel;
        this.masteryEventId = masteryEventId;
        this.emittedAt = emittedAt;
        this.policyVersionId = policyVersionId;
        this.policyHash = policyHash;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public String getJobPositionId() { return jobPositionId; }
    public String getMicroSkillId() { return microSkillId; }
    public UUID getModelVersionId() { return modelVersionId; }
    public UUID getMasteryMappingVersionId() { return masteryMappingVersionId; }
    public UUID getParameterSetId() { return parameterSetId; }
    public BigDecimal getTheta() { return theta; }
    public BigDecimal getStandardError() { return standardError; }
    public BigDecimal getEstimatedMastery() { return estimatedMastery; }
    public BigDecimal getMastery() { return mastery; }
    public String getConfidenceLabel() { return confidenceLabel; }
    public UUID getMasteryEventId() { return masteryEventId; }
    public Instant getEmittedAt() { return emittedAt; }
    public UUID getPolicyVersionId() { return policyVersionId; }
    public String getPolicyHash() { return policyHash; }

    public record Key(UUID attemptId, String microSkillId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
