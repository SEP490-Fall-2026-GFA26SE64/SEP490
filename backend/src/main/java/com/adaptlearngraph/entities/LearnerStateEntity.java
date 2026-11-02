package com.adaptlearngraph.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

/** platform.learner_state: per-learner revision counters (all default 0 on insert). */
@Entity
@Table(schema = "platform", name = "learner_state")
@DynamicInsert
@DynamicUpdate
public class LearnerStateEntity {
    @Id
    @Column(name = "learner_id")
    private UUID learnerId;
    @Column(name = "submission_sequence")
    private Long submissionSequence;
    @Column(name = "profile_revision")
    private Long profileRevision;
    @Column(name = "progress_revision")
    private Long progressRevision;
    @Column(name = "target_revision")
    private Long targetRevision;

    protected LearnerStateEntity() {
    }

    public LearnerStateEntity(UUID learnerId) {
        this.learnerId = learnerId;
    }

    public UUID getLearnerId() { return learnerId; }
    public Long getSubmissionSequence() { return submissionSequence; }
    public Long getProfileRevision() { return profileRevision; }
    public Long getProgressRevision() { return progressRevision; }
    public Long getTargetRevision() { return targetRevision; }
}
