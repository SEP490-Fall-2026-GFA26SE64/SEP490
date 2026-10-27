package com.adaptlearngraph.catalog.api;

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

        List<String> levels,

        String domainCode,

        String familyCode,

        @Pattern(regexp = "^(PROFESSIONAL|MANAGEMENT)?$", message = "Track must be either PROFESSIONAL or MANAGEMENT")
        String track,

        @Pattern(regexp = "^(P[1-5]|M[3-4])?$", message = "Seniority must be P1-P5 or M3-M4")
        String seniority,

        String assignedExpertId,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        List<String> responsibilities,

        String version,

        @Pattern(regexp = "^(DRAFT|SENT|REJECTED|ACTIVE|PUBLISHED|RETIRED)?$", message = "Status must be valid")
        String status,

        List<Map<String, Object>> skillTargets) {

    public CreateTargetRoleRequest(
            String code,
            String name,
            String domainCode,
            String familyCode,
            String track,
            String seniority,
            String assignedExpertId,
            String description,
            List<String> responsibilities) {
        this(code, name, List.of(), domainCode, familyCode, track, seniority, assignedExpertId, description, responsibilities, "1.0", "DRAFT", List.of());
    }

    public CreateTargetRoleRequest(
            String code,
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description) {
        this(code, name, List.of(), domainCode, familyCode, track, null, assignedExpertId, description, List.of(), "1.0", "DRAFT", List.of());
    }

    public CreateTargetRoleRequest(String code, String name, String familyCode, String track, String description) {
        this(code, name, List.of(), "ICT", familyCode, track, null, "", description, List.of(), "1.0", "DRAFT", List.of());
    }
}


