package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.Immutable;

/** platform.baseline_attempt_result: immutable scored result of a mastery-producing attempt; raw_score is database-generated. */
@Entity
@Immutable
@Table(schema = "platform", name = "baseline_attempt_result")
@DynamicInsert
public class BaselineAttemptResultEntity {
    @Id
    @Column(name = "attempt_id")
    private UUID attemptId;
    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;
    @Column(name = "answered_count", nullable = false)
    private Integer answeredCount;
    @Column(name = "correct_count", nullable = false)
    private Integer correctCount;
    @Column(name = "raw_score", insertable = false, updatable = false)
    private BigDecimal rawScore;
    @Column(name = "result_status", nullable = false)
    private String resultStatus;
    @Column(name = "scored_at", nullable = false)
    private Instant scoredAt;
    @Column(name = "mastery_event_id", nullable = false)
    private UUID masteryEventId;

    protected BaselineAttemptResultEntity() {
    }

    @SuppressWarnings("java:S107")
    public BaselineAttemptResultEntity(UUID attemptId, UUID organizationId, Integer answeredCount, Integer correctCount, String resultStatus, Instant scoredAt, UUID masteryEventId) {
        this.attemptId = attemptId;
        this.organizationId = organizationId;
        this.answeredCount = answeredCount;
        this.correctCount = correctCount;
        this.resultStatus = resultStatus;
        this.scoredAt = scoredAt;
        this.masteryEventId = masteryEventId;
    }

    public UUID getAttemptId() { return attemptId; }
    public UUID getOrganizationId() { return organizationId; }
    public Integer getAnsweredCount() { return answeredCount; }
    public Integer getCorrectCount() { return correctCount; }
    public BigDecimal getRawScore() { return rawScore; }
    public String getResultStatus() { return resultStatus; }
    public Instant getScoredAt() { return scoredAt; }
    public UUID getMasteryEventId() { return masteryEventId; }
}
