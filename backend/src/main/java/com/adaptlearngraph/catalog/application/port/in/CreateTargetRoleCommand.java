package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;

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
        List<String> competencyIds) {

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
        this(organizationId, code, name, familyCode, track, assignedExpertId, description, responsibilities, version, status, skillTargets, levels, "{}", List.of());
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
        this(organizationId, code, name, familyCode, track, assignedExpertId, description, responsibilities, version, status, skillTargets, List.of("Junior", "Middle", "Senior"));
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
