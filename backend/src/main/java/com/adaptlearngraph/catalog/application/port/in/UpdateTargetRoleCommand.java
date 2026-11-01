package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

import java.util.List;

public record UpdateTargetRoleCommand(
        String organizationId,
        TargetRoleId roleId,
        String name,
        String familyCode,
        RoleTrack track,
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

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason,
            List<String> levels) {
        this(organizationId, roleId, name, familyCode, track, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, levels, null, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason) {
        this(organizationId, roleId, name, familyCode, track, assignedExpertId, description, responsibilities, status, version, skillTargets, rejectionReason, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason) {
        this(organizationId, roleId, name, familyCode, track, assignedExpertId, description, null, status, version, skillTargets, rejectionReason);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status) {
        this(organizationId, roleId, name, familyCode, track, assignedExpertId, description, status, null, null, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        this(organizationId, roleId, name, familyCode, track, assignedExpertId, description, null, null, null, null);
    }
}
