package com.adaptlearngraph.entities;

import jakarta.persistence.*;
import java.util.UUID;

/** Immutable sidecar of the existing protected published item definition. */
@Entity
@Table(schema="platform",name="assessment_item_knowledge_mapping")
public class AssessmentItemKnowledgeMappingEntity {
    @Id @Column(name="item_version_id") private UUID itemVersionId;
    @Column(name="organization_id",nullable=false) private UUID organizationId;
    @Column(name="question_bank_id",nullable=false) private UUID questionBankId;
    @Column(name="skill_id",nullable=false) private String skillId;
    @Column(name="knowledge_level",nullable=false) private String knowledgeLevel;
    @Column(name="outcome_code") private String outcomeCode;
    @Column(name="mandatory",nullable=false) private boolean mandatory;
    @Column(name="mapping_version",nullable=false) private long mappingVersion;
    @Column(name="mapping_hash",nullable=false,columnDefinition=PostgresColumnTypes.CONTENT_HASH) private String mappingHash;
    protected AssessmentItemKnowledgeMappingEntity() {}
    public AssessmentItemKnowledgeMappingEntity(UUID item,UUID org,UUID bank,String skill,String level,String outcome,
            boolean mandatory,long version,String hash) {
        this.itemVersionId=item;this.organizationId=org;this.questionBankId=bank;this.skillId=skill;
        this.knowledgeLevel=level;this.outcomeCode=outcome;this.mandatory=mandatory;
        this.mappingVersion=version;this.mappingHash=hash;
    }
}
