package com.adaptlearngraph.entities.domain;

import java.time.Instant;
import java.util.Objects;

public record PrerequisiteEdge(
        String sourceSkillId,
        String sourceSkillCode,
        String sourceSkillName,
        String targetSkillId,
        String targetSkillCode,
        String targetSkillName,
        double minMastery,
        SkillStatus status,
        Instant createdAt,
        Instant updatedAt,
        KnowledgeLevel dependentKnowledgeLevel,
        KnowledgeLevel prerequisiteKnowledgeLevel) {

    public PrerequisiteEdge(String sourceSkillId,String sourceSkillCode,String sourceSkillName,String targetSkillId,
            String targetSkillCode,String targetSkillName,double minMastery,SkillStatus status,Instant createdAt,Instant updatedAt) {
        this(sourceSkillId,sourceSkillCode,sourceSkillName,targetSkillId,targetSkillCode,targetSkillName,minMastery,status,createdAt,updatedAt,null,null);
    }

    public PrerequisiteEdge {
        Objects.requireNonNull(sourceSkillId, "sourceSkillId cannot be null");
        Objects.requireNonNull(targetSkillId, "targetSkillId cannot be null");
        if (sourceSkillId.equals(targetSkillId) && Objects.equals(dependentKnowledgeLevel,prerequisiteKnowledgeLevel)) {
            throw new IllegalArgumentException("Self-referencing prerequisite is not allowed");
        }
        if (minMastery < 0.0 || minMastery > 1.0) {
            throw new IllegalArgumentException("minMastery must be between 0.0 and 1.0, was " + minMastery);
        }
        sourceSkillCode = sourceSkillCode != null ? sourceSkillCode : "";
        sourceSkillName = sourceSkillName != null ? sourceSkillName : "";
        targetSkillCode = targetSkillCode != null ? targetSkillCode : "";
        targetSkillName = targetSkillName != null ? targetSkillName : "";
        status = status != null ? status : SkillStatus.ACTIVE;
        createdAt = createdAt != null ? createdAt : Instant.now();
        updatedAt = updatedAt != null ? updatedAt : Instant.now();
        if ((dependentKnowledgeLevel == null) != (prerequisiteKnowledgeLevel == null))
            throw new IllegalArgumentException("Both prerequisite knowledge levels are required");
    }

    @Deprecated public double minMastery() {
        if(dependentKnowledgeLevel!=null)throw new IllegalStateException("NUMERIC_PREREQUISITE_RETIRED");
        return minMastery;
    }
}
