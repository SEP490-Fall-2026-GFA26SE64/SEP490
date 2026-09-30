package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

public record UpdateTargetRoleCommand(
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
        String skillTargets) {

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
        this(organizationId, roleId, name, domainCode, familyCode, track, assignedExpertId, description, status, null, null);
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
        this(organizationId, roleId, name, domainCode, familyCode, track, assignedExpertId, description, null, null, null);
    }
}

