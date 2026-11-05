package com.adaptlearngraph.entities;

import jakarta.persistence.*;
import java.io.Serializable;

/** Server-owned learning provenance, scoped to the trusted organization and learner. */
@Entity @Table(schema="platform", name="learning_module_completion") @IdClass(LearningModuleCompletionEntity.Key.class)
public class LearningModuleCompletionEntity {
    @Id @Column(name="organization_id") private String organizationId;
    @Id @Column(name="learner_id") private String learnerId;
    @Id @Column(name="module_id") private String moduleId;
    @Id @Column(name="revision") private Integer revision;
    @Column(name="skill_id", nullable=false) private String skillId;
    @Column(name="completed_at", nullable=false) private java.time.Instant completedAt;
    @Column(name="content_version", nullable=false) private String contentVersion;
    protected LearningModuleCompletionEntity() {}
    public record Key(String organizationId, String learnerId, String moduleId, Integer revision) implements Serializable {
        public Key() { this(null,null,null,null); }
    }
}
