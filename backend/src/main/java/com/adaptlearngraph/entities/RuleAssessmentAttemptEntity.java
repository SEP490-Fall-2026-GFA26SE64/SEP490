package com.adaptlearngraph.entities;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Owned frozen context. Conditional repository operations alone advance the attempt revision. */
@Entity @Table(schema="platform",name="rule_assessment_attempt")
public class RuleAssessmentAttemptEntity {
    @Id private UUID id;
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="learner_id",nullable=false) private UUID learnerId;
    @Column(nullable=false) private String purpose;
    @Column(name="context_key",nullable=false) private String contextKey;
    @Column(name="selection_id",nullable=false) private UUID selectionId;
    @Column(name="selection_revision",nullable=false) private long selectionRevision;
    @Column(name="policy_id",nullable=false) private UUID policyId;
    @Column(name="policy_hash",nullable=false,columnDefinition=PostgresColumnTypes.CONTENT_HASH) private String policyHash;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="context_snapshot",nullable=false,columnDefinition="jsonb") private String contextSnapshot;
    @Column(nullable=false) private String state;
    @Column(nullable=false) private long revision;
    @Column(name="started_at",nullable=false) private Instant startedAt;
    @Column(name="deadline_at",nullable=false) private Instant deadlineAt;
    @Column(name="finished_at") private Instant finishedAt;
    @Column(name="finish_reason") private String finishReason;
    @Column(name="previous_attempt_id") private UUID previousAttemptId;
    @Column(name="processing_status",nullable=false) private String processingStatus;
    protected RuleAssessmentAttemptEntity() {}
    public RuleAssessmentAttemptEntity(UUID id,UUID org,UUID learner,String purpose,String contextKey,UUID selectionId,
            long selectionRevision,UUID policyId,String policyHash,String snapshot,Instant start,Instant deadline,UUID previous) {
        this.id=id;this.organizationId=org;this.learnerId=learner;this.purpose=purpose;this.contextKey=contextKey;
        this.selectionId=selectionId;this.selectionRevision=selectionRevision;this.policyId=policyId;this.policyHash=policyHash;
        this.contextSnapshot=snapshot;this.startedAt=start;this.deadlineAt=deadline;this.previousAttemptId=previous;
        this.state="IN_PROGRESS";this.revision=1;this.processingStatus="PENDING";
    }
    public UUID getId(){return id;}
    public UUID getOrganizationId(){return organizationId;}
    public UUID getLearnerId(){return learnerId;}
    public String getPurpose(){return purpose;}
    public String getContextKey(){return contextKey;}
    public UUID getSelectionId(){return selectionId;}
    public long getSelectionRevision(){return selectionRevision;}
    public UUID getPolicyId(){return policyId;}
    public String getPolicyHash(){return policyHash;}
    public String getContextSnapshot(){return contextSnapshot;}
    public String getState(){return state;}
    public long getRevision(){return revision;}
    public Instant getStartedAt(){return startedAt;}
    public Instant getDeadlineAt(){return deadlineAt;}
    public Instant getFinishedAt(){return finishedAt;}
    public String getFinishReason(){return finishReason;}
    public UUID getPreviousAttemptId(){return previousAttemptId;}
}
