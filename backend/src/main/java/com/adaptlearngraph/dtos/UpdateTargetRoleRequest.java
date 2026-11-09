package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.RoleTrack;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record UpdateTargetRoleRequest(
        @Size(max = 128, message = "Role name must not exceed 128 characters")
        String name,

        String familyCode,

        @Pattern(regexp = "^(PROFESSIONAL|MANAGEMENT)?$", message = "Track must be either PROFESSIONAL or MANAGEMENT")
        String track,

        String assignedExpertId,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        List<String> responsibilities,

        @Pattern(regexp = "^(DRAFT|SENT|SUBMITTED|REJECTED|ACTIVE|PUBLISHED|UNPUBLISHED)?$", message = "Status must be valid")
        String status,

        String version,

        List<Map<String, Object>> skillTargets,

        @Size(max = 2000, message = "Rejection reason cannot exceed 2000 characters")
        String rejectionReason,

        List<String> levels,

        Map<String, List<String>> levelCompetencies,

        List<String> competencyIds,

        Map<String, String> levelDurations) {

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            String rejectionReason,
            List<String> levels,
            Map<String, List<String>> levelCompetencies,
            List<String> competencyIds) {
        this(name, familyCode, track, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, levels, levelCompetencies, competencyIds, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            String rejectionReason,
            List<String> levels) {
        this(name, familyCode, track, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, levels, null, null, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            String rejectionReason) {
        this(name, familyCode, track, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            String rejectionReason) {
        this(name, familyCode, track, assignedExpertId, description, List.of(), status, version, skillTargets, rejectionReason, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            String status,
            String version,
            List<Map<String, Object>> skillTargets) {
        this(name, familyCode, track, assignedExpertId, description, List.of(), status, version, skillTargets, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            String status) {
        this(name, familyCode, track, assignedExpertId, description, List.of(), status, null, null, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        this(name, familyCode, track != null ? track.name() : null, assignedExpertId, description, List.of(), null, null, null, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String familyCode,
            String track,
            String assignedExpertId,
            String description) {
        this(name, familyCode, track, assignedExpertId, description, List.of(), null, null, null, null);
    }
}
