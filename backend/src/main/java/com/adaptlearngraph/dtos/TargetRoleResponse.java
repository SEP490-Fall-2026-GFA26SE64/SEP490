package com.adaptlearngraph.dtos;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record TargetRoleResponse(
        String id,
        String organizationId,
        String code,
        String name,
        String familyCode,
        String assignedExpertId,
        String description,
        List<String> responsibilities,
        String status,
        String version,
        List<Map<String, Object>> skillTargets,
        Instant createdAt,
        Instant updatedAt,
        String rejectionReason,
        List<String> levels,
        Map<String, List<String>> levelCompetencies,
        List<String> competencyIds,
        Map<String, String> levelDurations,
        Boolean isStaffingEnabled) {

    public TargetRoleResponse(
            String id,
            String organizationId,
            String code,
            String name,
            String familyCode,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason,
            List<String> levels,
            Map<String, List<String>> levelCompetencies,
            List<String> competencyIds,
            Map<String, String> levelDurations) {
        this(id, organizationId, code, name, familyCode, assignedExpertId, description, responsibilities, status, version, skillTargets, createdAt, updatedAt, rejectionReason, levels, levelCompetencies, competencyIds, levelDurations, "STAGED".equalsIgnoreCase(status));
    }

    public TargetRoleResponse(
            String id,
            String organizationId,
            String code,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason,
            List<String> levels,
            Map<String, List<String>> levelCompetencies,
            List<String> competencyIds,
            Map<String, String> levelDurations,
            Boolean isStaffingEnabled) {
        this(id, organizationId, code, name, "", assignedExpertId, description, responsibilities, status, version, skillTargets, createdAt, updatedAt, rejectionReason, levels, levelCompetencies, competencyIds, levelDurations, isStaffingEnabled);
    }

    public TargetRoleResponse(
            String id,
            String organizationId,
            String code,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason,
            List<String> levels,
            Map<String, List<String>> levelCompetencies,
            List<String> competencyIds,
            Map<String, String> levelDurations) {
        this(id, organizationId, code, name, "", assignedExpertId, description, responsibilities, status, version, skillTargets, createdAt, updatedAt, rejectionReason, levels, levelCompetencies, competencyIds, levelDurations, "STAGED".equalsIgnoreCase(status));
    }

    public TargetRoleResponse(
            String id,
            String organizationId,
            String code,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason,
            List<String> levels,
            Map<String, List<String>> levelCompetencies,
            List<String> competencyIds) {
        this(id, organizationId, code, name, "", assignedExpertId, description, responsibilities, status, version, skillTargets, createdAt, updatedAt, rejectionReason, levels, levelCompetencies, competencyIds, Map.of());
    }

    public TargetRoleResponse(
            String id,
            String organizationId,
            String code,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason,
            List<String> levels) {
        this(id, organizationId, code, name, "", assignedExpertId, description, responsibilities, status, version, skillTargets, createdAt, updatedAt, rejectionReason, levels, Map.of(), List.of(), Map.of());
    }

    public TargetRoleResponse(
            String id,
            String organizationId,
            String code,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String status,
            String version,
            List<Map<String, Object>> skillTargets,
            Instant createdAt,
            Instant updatedAt,
            String rejectionReason) {
        this(id, organizationId, code, name, assignedExpertId, description, responsibilities, status, version, skillTargets, createdAt, updatedAt, rejectionReason, List.of("Senior", "Middle", "Junior"));
    }
}
