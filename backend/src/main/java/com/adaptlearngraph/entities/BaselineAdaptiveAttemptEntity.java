package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** platform.baseline_adaptive_attempt: header of one adaptive baseline attempt; transitions are revision/state-fenced (triggers adaptive_attempt_header/complete). */
@Entity
@Table(schema = "platform", name = "baseline_adaptive_attempt")
@DynamicInsert
@DynamicUpdate
public class BaselineAdaptiveAttemptEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "learner_id", nullable = false)
    private UUID learnerId;
    @Column(name = "occupation_id", nullable = false)
    private String occupationId;
    @Column(name = "attempt_purpose", nullable = false)
    private String attemptPurpose;
    @Column(name = "target_role_id")
    private String targetRoleId;
    @Column(name = "target_selection_revision")
    private Long targetSelectionRevision;
    @Column(name = "blueprint_id", nullable = false)
    private UUID blueprintId;
    @Column(name = "blueprint_version", nullable = false)
    private Integer blueprintVersion;
    @Column(name = "model_version_id", nullable = false)
    private UUID modelVersionId;
    @Column(name = "mastery_mapping_version_id", nullable = false)
    private UUID masteryMappingVersionId;
    @Column(name = "parameter_set_id", nullable = false)
    private UUID parameterSetId;
    @Column(name = "catalog_fingerprint", nullable = false)
    private String catalogFingerprint;
    @Column(name = "max_questions", nullable = false)
    private Integer maxQuestions;
    @Column(name = "time_limit_seconds", nullable = false)
    private Integer timeLimitSeconds;
    @Column(name = "state", nullable = false)
    private String state;
    @Column(name = "revision", nullable = false)
    private Long revision;
    @Column(name = "started_at", nullable = false)
    private Instant startedAt;
    @Column(name = "deadline_at", nullable = false)
    private Instant deadlineAt;
    @Column(name = "finished_at")
    private Instant finishedAt;
    @Column(name = "completion_reason")
    private String completionReason;
    @Column(name = "replaces_attempt_id")
    private UUID replacesAttemptId;
    @Column(name = "scope_policy")
    private String scopePolicy;
    @Column(name = "assessment_policy_mode")
    private String assessmentPolicyMode;
    @Column(name = "assessment_policy_version_id")
    private UUID assessmentPolicyVersionId;
    @Column(name = "assessment_policy_hash", columnDefinition = PostgresColumnTypes.CONTENT_HASH)
    private String assessmentPolicyHash;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "assessment_policy_snapshot", columnDefinition = "jsonb")
    private String assessmentPolicySnapshot;

    protected BaselineAdaptiveAttemptEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAdaptiveAttemptEntity(UUID attemptId, UUID organizationId, UUID learnerId, String occupationId, String attemptPurpose, String targetRoleId, Long targetSelectionRevision, UUID blueprintId, Integer blueprintVersion, UUID modelVersionId, UUID masteryMappingVersionId, UUID parameterSetId, String catalogFingerprint, Integer maxQuestions, Integer timeLimitSeconds, String state, Long revision, Instant startedAt, Instant deadlineAt, Instant finishedAt, String completionReason, UUID replacesAttemptId, String scopePolicy, String assessmentPolicyMode, UUID assessmentPolicyVersionId, String assessmentPolicyHash, String assessmentPolicySnapshot) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.learnerId = learnerId;
        this.occupationId = occupationId;
        this.attemptPurpose = attemptPurpose;
        this.targetRoleId = targetRoleId;
        this.targetSelectionRevision = targetSelectionRevision;
        this.blueprintId = blueprintId;
        this.blueprintVersion = blueprintVersion;
        this.modelVersionId = modelVersionId;
        this.masteryMappingVersionId = masteryMappingVersionId;
        this.parameterSetId = parameterSetId;
        this.catalogFingerprint = catalogFingerprint;
        this.maxQuestions = maxQuestions;
        this.timeLimitSeconds = timeLimitSeconds;
        this.state = state;
        this.revision = revision;
        this.startedAt = startedAt;
        this.deadlineAt = deadlineAt;
        this.finishedAt = finishedAt;
        this.completionReason = completionReason;
        this.replacesAttemptId = replacesAttemptId;
        this.scopePolicy = scopePolicy;
        this.assessmentPolicyMode = assessmentPolicyMode;
        this.assessmentPolicyVersionId = assessmentPolicyVersionId;
        this.assessmentPolicyHash = assessmentPolicyHash;
        this.assessmentPolicySnapshot = assessmentPolicySnapshot;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getLearnerId() { return learnerId; }
    public String getOccupationId() { return occupationId; }
    public String getAttemptPurpose() { return attemptPurpose; }
    public String getTargetRoleId() { return targetRoleId; }
    public Long getTargetSelectionRevision() { return targetSelectionRevision; }
    public UUID getBlueprintId() { return blueprintId; }
    public Integer getBlueprintVersion() { return blueprintVersion; }
    public UUID getModelVersionId() { return modelVersionId; }
    public UUID getMasteryMappingVersionId() { return masteryMappingVersionId; }
    public UUID getParameterSetId() { return parameterSetId; }
    public String getCatalogFingerprint() { return catalogFingerprint; }
    public Integer getMaxQuestions() { return maxQuestions; }
    public Integer getTimeLimitSeconds() { return timeLimitSeconds; }
    public String getState() { return state; }
    public Long getRevision() { return revision; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getDeadlineAt() { return deadlineAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public String getCompletionReason() { return completionReason; }
    public UUID getReplacesAttemptId() { return replacesAttemptId; }
    public String getScopePolicy() { return scopePolicy; }
    public String getAssessmentPolicyMode() { return assessmentPolicyMode; }
    public UUID getAssessmentPolicyVersionId() { return assessmentPolicyVersionId; }
    public String getAssessmentPolicyHash() { return assessmentPolicyHash; }
    public String getAssessmentPolicySnapshot() { return assessmentPolicySnapshot; }
}
