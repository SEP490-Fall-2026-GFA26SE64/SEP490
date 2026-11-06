package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.RoleTrack;

import java.util.List;

public record CreateTargetRoleCommand(
        String organizationId,
        String code,
        String name,
        String familyCode,
        RoleTrack track,
        String assignedExpertId,
        String description,
        List<String> responsibilities,
        String version,
        RoleStatus status,
        String skillTargets,
        List<String> levels,
        String levelCompetencies,
        List<String> competencyIds,
        java.util.Map<String, String> levelDurations) {

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            RoleStatus status,
            String skillTargets,
            List<String> levels,
            String levelCompetencies,
            List<String> competencyIds) {
        this(organizationId, code, name, familyCode, track, assignedExpertId, description, responsibilities, version, status, skillTargets, levels, levelCompetencies, competencyIds, java.util.Map.of());
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            RoleStatus status,
            String skillTargets,
            List<String> levels) {
        this(organizationId, code, name, familyCode, track, assignedExpertId, description, responsibilities, version, status, skillTargets, levels, "{}", List.of(), java.util.Map.of());
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            RoleStatus status,
            String skillTargets) {
        this(organizationId, code, name, familyCode, track, assignedExpertId, description, responsibilities, version, status, skillTargets, List.of("Senior", "Middle", "Junior"));
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        this(organizationId, code, name, familyCode, track, assignedExpertId, description, List.of(), "1.0", RoleStatus.DRAFT, "[]");
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String description) {
        this(organizationId, code, name, familyCode, track, "", description);
    }
}
