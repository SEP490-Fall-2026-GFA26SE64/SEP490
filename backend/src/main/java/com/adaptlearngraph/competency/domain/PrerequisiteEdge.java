package com.adaptlearngraph.competency.domain;

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
        Instant updatedAt) {

    public PrerequisiteEdge {
        Objects.requireNonNull(sourceSkillId, "sourceSkillId cannot be null");
        Objects.requireNonNull(targetSkillId, "targetSkillId cannot be null");
        if (sourceSkillId.equals(targetSkillId)) {
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
    }
}
