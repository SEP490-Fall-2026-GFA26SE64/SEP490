package com.adaptlearngraph.catalog.api;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record UpdateTargetRoleRequest(
        @Size(max = 128, message = "Role name must not exceed 128 characters")
        String name,

        String domainCode,

        String familyCode,

        @Pattern(regexp = "^(PROFESSIONAL|MANAGEMENT)?$", message = "Track must be either PROFESSIONAL or MANAGEMENT")
        String track,

        String assignedExpertId,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        @Pattern(regexp = "^(DRAFT|SENT|REJECTED|ACTIVE|PUBLISHED|RETIRED)?$", message = "Status must be valid")
        String status,

        String version,

        List<Map<String, Object>> skillTargets) {

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            String status) {
        this(name, domainCode, familyCode, track, assignedExpertId, description, status, null, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description) {
        this(name, domainCode, familyCode, track, assignedExpertId, description, null, null, null);
    }
}

