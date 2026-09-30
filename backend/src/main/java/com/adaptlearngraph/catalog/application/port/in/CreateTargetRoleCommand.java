package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;

public record CreateTargetRoleCommand(
        String organizationId,
        String code,
        String name,
        String domainCode,
        String familyCode,
        RoleTrack track,
        String assignedExpertId,
        String description,
        String version,
        RoleStatus status,
        String skillTargets) {

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        this(organizationId, code, name, domainCode, familyCode, track, assignedExpertId, description, "1.0", RoleStatus.DRAFT, "[]");
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String description) {
        this(organizationId, code, name, "ICT", familyCode, track, "", description, "1.0", RoleStatus.DRAFT, "[]");
    }
}

