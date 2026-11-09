package com.adaptlearngraph.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMicroSkillRequest(
        @NotBlank(message = "name cannot be blank")
        @Size(max = 100, message = "name cannot exceed 100 characters")
        String name,

        @Size(max = 1000, message = "description cannot exceed 1000 characters")
        String description,

        SkillStatusDto status,
        String expectedVersion,
        java.util.List<String> moduleOnlyKnowledgeLevels,
        java.util.List<String> certificateOnlyKnowledgeLevels,
        java.util.List<String> foundationOutcomeCodes,
        java.util.List<String> intermediateOutcomeCodes,
        java.util.List<String> advancedOutcomeCodes) {
    public UpdateMicroSkillRequest(String name, String description, SkillStatusDto status) {
        this(name, description, status, null, null, null, null, null, null);
    }
    public com.adaptlearngraph.entities.domain.SkillProvision provision() {
        return com.adaptlearngraph.entities.domain.SkillProvision.optional(moduleOnlyKnowledgeLevels, certificateOnlyKnowledgeLevels,
                foundationOutcomeCodes, intermediateOutcomeCodes, advancedOutcomeCodes);
    }
}
