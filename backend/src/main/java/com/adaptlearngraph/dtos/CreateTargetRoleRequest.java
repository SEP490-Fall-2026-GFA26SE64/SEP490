package com.adaptlearngraph.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record CreateTargetRoleRequest(
        @Size(max = 64, message = "Role code must be at most 64 characters")
        String code,

        @NotBlank(message = "Role name is required")
        @Size(min = 2, max = 128, message = "Role name must be between 2 and 128 characters")
        String name,

        String familyCode,

        List<String> levels,

        String assignedExpertId,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        List<String> responsibilities,

        String version,

        @Pattern(regexp = "^(DRAFT|STAGED|SENT|REJECTED|ACTIVE|PUBLISHED|UNPUBLISHED)?$", message = "Status must be valid")
        String status,

        List<Map<String, Object>> skillTargets,

        Map<String, List<String>> levelCompetencies,

        List<String> competencyIds,

        Map<String, String> levelDurations) {

    public CreateTargetRoleRequest(
            String code,
            String name,
            List<String> levels,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            String status,
            List<Map<String, Object>> skillTargets,
            Map<String, List<String>> levelCompetencies,
            List<String> competencyIds,
            Map<String, String> levelDurations) {
        this(code, name, "", levels, assignedExpertId, description, responsibilities, version, status, skillTargets, levelCompetencies, competencyIds, levelDurations);
    }

    public CreateTargetRoleRequest(
            String code,
            String name,
            List<String> levels,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            String status,
            List<Map<String, Object>> skillTargets,
            Map<String, List<String>> levelCompetencies,
            List<String> competencyIds) {
        this(code, name, "", levels, assignedExpertId, description, responsibilities, version, status, skillTargets, levelCompetencies, competencyIds, Map.of());
    }

    public CreateTargetRoleRequest(
            String code,
            String name,
            List<String> levels,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            String status,
            List<Map<String, Object>> skillTargets) {
        this(code, name, levels, assignedExpertId, description, responsibilities, version, status, skillTargets, Map.of(), List.of(), Map.of());
    }

    public CreateTargetRoleRequest(
            String code,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities) {
        this(code, name, List.of(), assignedExpertId, description, responsibilities, "1.0", "DRAFT", List.of());
    }

    public CreateTargetRoleRequest(
            String code,
            String name,
            String assignedExpertId,
            String description) {
        this(code, name, List.of(), assignedExpertId, description, List.of(), "1.0", "DRAFT", List.of());
    }

    public CreateTargetRoleRequest(String code, String name, String description) {
        this(code, name, List.of(), "", description, List.of(), "1.0", "DRAFT", List.of());
    }
}
