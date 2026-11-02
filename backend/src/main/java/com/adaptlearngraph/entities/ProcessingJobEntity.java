package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.processing_job. Leasing and completion are fenced native/JPQL updates, never dirty-checked saves. */
@Entity
@Table(schema = "platform", name = "processing_job")
@DynamicInsert
@DynamicUpdate
public class ProcessingJobEntity {
    @Id
    @Column(name = "job_id")
    private UUID jobId;
    @Column(name = "event_id", nullable = false, updatable = false)
    private UUID eventId;
    @Column(name = "handler", nullable = false, updatable = false)
    private String handler;
    @Column(name = "learner_id")
    private UUID learnerId;
    @Column(name = "submission_sequence")
    private Long submissionSequence;
    @Column(name = "predecessor_job_id")
    private UUID predecessorJobId;
    @Column(name = "status")
    private String status;
    @Column(name = "lease_owner")
    private String leaseOwner;
    @Column(name = "lease_expires_at")
    private Instant leaseExpiresAt;
    @Column(name = "attempts")
    private Integer attempts;
    @Column(name = "next_retry_at")
    private Instant nextRetryAt;
    @Column(name = "failure_code")
    private String failureCode;
    @Column(name = "created_at")
    private Instant createdAt;

    protected ProcessingJobEntity() {
    }

    public ProcessingJobEntity(UUID jobId, UUID eventId, String handler, Instant nextRetryAt, Instant createdAt) {
        this.jobId = jobId;
        this.eventId = eventId;
        this.handler = handler;
        this.nextRetryAt = nextRetryAt;
        this.createdAt = createdAt;
    }

    public UUID getJobId() { return jobId; }
    public UUID getEventId() { return eventId; }
    public String getHandler() { return handler; }
    public UUID getLearnerId() { return learnerId; }
    public Long getSubmissionSequence() { return submissionSequence; }
    public UUID getPredecessorJobId() { return predecessorJobId; }
    public String getStatus() { return status; }
    public String getLeaseOwner() { return leaseOwner; }
    public Instant getLeaseExpiresAt() { return leaseExpiresAt; }
    public Integer getAttempts() { return attempts; }
    public Instant getNextRetryAt() { return nextRetryAt; }
    public String getFailureCode() { return failureCode; }
    public Instant getCreatedAt() { return createdAt; }
}
