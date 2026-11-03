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
        String track,
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

    public TargetRoleResponse(
            String id,
            String organizationId,
            String code,
            String name,
            String familyCode,
            String track,
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
        this(id, organizationId, code, name, familyCode, track, assignedExpertId, description, responsibilities, status, version, skillTargets, createdAt, updatedAt, rejectionReason, levels, Map.of(), List.of());
    }
}