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
import org.hibernate.annotations.DynamicUpdate;

/** platform.baseline_attempt_skill_state: running per-skill estimate of one adaptive attempt; updates are revision-fenced. */
@Entity
@Table(schema = "platform", name = "baseline_attempt_skill_state")
@IdClass(BaselineAttemptSkillStateEntity.Key.class)
@DynamicInsert
@DynamicUpdate
public class BaselineAttemptSkillStateEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;
    @Id
    @Column(name = "micro_skill_id")
    private String microSkillId;
    @Column(name = "theta", nullable = false)
    private BigDecimal theta;
    @Column(name = "standard_error", nullable = false)
    private BigDecimal standardError;
    @Column(name = "test_information", nullable = false)
    private BigDecimal testInformation;
    @Column(name = "answered_count", nullable = false)
    private Integer answeredCount;
    @Column(name = "revision", nullable = false)
    private Long revision;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BaselineAttemptSkillStateEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAttemptSkillStateEntity(UUID attemptId, UUID organizationId, String microSkillId, BigDecimal theta, BigDecimal standardError, BigDecimal testInformation, Integer answeredCount, Long revision, Instant updatedAt) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.microSkillId = microSkillId;
        this.theta = theta;
        this.standardError = standardError;
        this.testInformation = testInformation;
        this.answeredCount = answeredCount;
        this.revision = revision;
        this.updatedAt = updatedAt;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public String getMicroSkillId() { return microSkillId; }
    public BigDecimal getTheta() { return theta; }
    public BigDecimal getStandardError() { return standardError; }
    public BigDecimal getTestInformation() { return testInformation; }
    public Integer getAnsweredCount() { return answeredCount; }
    public Long getRevision() { return revision; }
    public Instant getUpdatedAt() { return updatedAt; }

    public record Key(UUID attemptId, String microSkillId) implements Serializable {
        public Key() {
            this(null, null);
        }
    }
}
