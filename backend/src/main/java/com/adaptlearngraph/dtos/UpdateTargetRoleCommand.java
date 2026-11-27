package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.TargetRoleId;

import java.util.List;

public record UpdateTargetRoleCommand(
        String organizationId,
        TargetRoleId roleId,
        String name,
        String familyCode,
        String assignedExpertId,
        String description,
        List<String> responsibilities,
        RoleStatus status,
        String version,
        String skillTargets,
        String rejectionReason,
        List<String> levels,
        String levelCompetencies,
        List<String> competencyIds,
        java.util.Map<String, String> levelDurations) {

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason,
            List<String> levels,
            String levelCompetencies,
            List<String> competencyIds,
            java.util.Map<String, String> levelDurations) {
        this(organizationId, roleId, name, "", assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, levels, levelCompetencies, competencyIds, levelDurations);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason,
            List<String> levels,
            String levelCompetencies,
            List<String> competencyIds) {
        this(organizationId, roleId, name, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, levels, levelCompetencies, competencyIds, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason,
            List<String> levels) {
        this(organizationId, roleId, name, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, levels, null, null, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason) {
        this(organizationId, roleId, name, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String assignedExpertId,
            String description,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason) {
        this(organizationId, roleId, name, assignedExpertId, description, null, status, version, skillTargets, rejectionReason);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String assignedExpertId,
            String description,
            RoleStatus status) {
        this(organizationId, roleId, name, assignedExpertId, description, status, null, null, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String assignedExpertId,
            String description) {
        this(organizationId, roleId, name, assignedExpertId, description, null, null, null, null);
    }
}
