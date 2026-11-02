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

/** platform.baseline_attempt_skill_result: immutable finalized per-skill result (trigger result_assessment_policy_insert). */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_attempt_skill_result")
@IdClass(BaselineAttemptSkillResultEntity.Key.class)
@DynamicInsert
public class BaselineAttemptSkillResultEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Id
    @Column(name = "micro_skill_id")
    private String microSkillId;
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
    @Column(name = "mastery_mapping_version_id", nullable = false)
    private UUID masteryMappingVersionId;
    @Column(name = "finalized_at", nullable = false)
    private Instant finalizedAt;
    @Column(name = "policy_version_id")
    private UUID policyVersionId;
    @Column(name = "policy_hash", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String policyHash;

    protected BaselineAttemptSkillResultEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAttemptSkillResultEntity(UUID attemptId, UUID organizationId, String microSkillId, BigDecimal theta, BigDecimal standardError, BigDecimal estimatedMastery, BigDecimal mastery, String confidenceLabel, UUID masteryMappingVersionId, Instant finalizedAt, UUID policyVersionId, String policyHash) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.microSkillId = microSkillId;
        this.theta = theta;
        this.standardError = standardError;
        this.estimatedMastery = estimatedMastery;
        this.mastery = mastery;
        this.confidenceLabel = confidenceLabel;
        this.masteryMappingVersionId = masteryMappingVersionId;
        this.finalizedAt = finalizedAt;
        this.policyVersionId = policyVersionId;
        this.policyHash = policyHash;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public String getMicroSkillId() { return microSkillId; }
    public BigDecimal getTheta() { return theta; }
    public BigDecimal getStandardError() { return standardError; }
    public BigDecimal getEstimatedMastery() { return estimatedMastery; }
    public BigDecimal getMastery() { return mastery; }
    public String getConfidenceLabel() { return confidenceLabel; }
    public UUID getMasteryMappingVersionId() { return masteryMappingVersionId; }
    public Instant getFinalizedAt() { return finalizedAt; }
    public UUID getPolicyVersionId() { return policyVersionId; }
    public String getPolicyHash() { return policyHash; }

    public record Key(UUID attemptId, String microSkillId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
