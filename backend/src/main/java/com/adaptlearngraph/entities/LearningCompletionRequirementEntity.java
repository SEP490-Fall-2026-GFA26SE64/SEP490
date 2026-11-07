package com.adaptlearngraph.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Immutable exact-knowledge sidecar of the existing lesson completion owner. */
@Entity @Table(schema="platform",name="learning_completion_requirement")
@IdClass(LearningModuleCompletionEntity.Key.class)
public class LearningCompletionRequirementEntity {
    @Id @Column(name="organization_id") private String organizationId;
    @Id @Column(name="learner_id") private String learnerId;
    @Id @Column(name="module_id") private String moduleId;
    @Id @Column(name="revision") private Integer revision;
    @Column(name="knowledge_level",nullable=false) private String knowledgeLevel;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="requirement_snapshot",nullable=false,columnDefinition="jsonb") private String requirementSnapshot;
    protected LearningCompletionRequirementEntity() {}
}
