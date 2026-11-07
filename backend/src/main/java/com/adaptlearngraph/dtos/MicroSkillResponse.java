package com.adaptlearngraph.dtos;

import java.time.Instant;

public record MicroSkillResponse(
        String id,
        String organizationId,
        String code,
        String name,
        String description,
        String status,
        Instant createdAt,
        Instant updatedAt,
        String version,
        java.util.List<String> moduleOnlyKnowledgeLevels,
        java.util.List<String> certificateOnlyKnowledgeLevels,
        java.util.List<String> foundationOutcomeCodes,
        java.util.List<String> intermediateOutcomeCodes,
        java.util.List<String> advancedOutcomeCodes) {
}
