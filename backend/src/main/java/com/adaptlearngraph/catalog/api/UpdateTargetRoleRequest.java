package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.domain.RoleTrack;
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

        @Pattern(regexp = "^(P[1-5]|M[3-4])?$", message = "Seniority must be P1-P5 or M3-M4")
        String seniority,

        String assignedExpertId,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description,

        List<String> responsibilities,

        @Pattern(regexp = "^(DRAFT|SENT|SUBMITTED|REJECTED|ACTIVE|PUBLISHED|RETIRED)?$", message = "Status must be valid")
        String status,

        String version,

        List<Map<String, Object>> skillTargets,

        @Size(max = 2000, message = "Rejection reason cannot exceed 2000 characters")
        String rejectionReason,

        List<String> levels) {

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            String track,
            String seniority,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            String rejectionReason) {
        this(name, domainCode, familyCode, track, seniority, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            String rejectionReason) {
        this(name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), status, version, skillTargets, rejectionReason, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            String status,
            String version,
            List<Map<String, Object>> skillTargets) {
        this(name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), status, version, skillTargets, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description,
            String status) {
        this(name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), status, null, null, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        this(name, domainCode, familyCode, track != null ? track.name() : null, null, assignedExpertId, description, List.of(), null, null, null, null);
    }

    public UpdateTargetRoleRequest(
            String name,
            String domainCode,
            String familyCode,
            String track,
            String assignedExpertId,
            String description) {
        this(name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), null, null, null, null);
    }
}

