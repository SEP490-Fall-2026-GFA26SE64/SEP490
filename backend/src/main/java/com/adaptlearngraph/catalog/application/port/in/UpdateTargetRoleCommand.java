package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

import java.util.List;

public record UpdateTargetRoleCommand(
        String organizationId,
        TargetRoleId roleId,
        String name,
        String domainCode,
        String familyCode,
        RoleTrack track,
        Seniority seniority,
        String assignedExpertId,
        String description,
        List<String> responsibilities,
        RoleStatus status,
        String version,
        String skillTargets,
        String rejectionReason) {

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status,
            String version,
            String skillTargets,
            String rejectionReason) {
        this(organizationId, roleId, name, domainCode, familyCode, track, null, assignedExpertId, description, null, status, version, skillTargets, rejectionReason);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            RoleStatus status) {
        this(organizationId, roleId, name, domainCode, familyCode, track, assignedExpertId, description, status, null, null, null);
    }

    public UpdateTargetRoleCommand(
            String organizationId,
            TargetRoleId roleId,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        this(organizationId, roleId, name, domainCode, familyCode, track, assignedExpertId, description, null, null, null, null);
    }
}

