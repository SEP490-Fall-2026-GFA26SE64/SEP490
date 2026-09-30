package com.adaptlearngraph.catalog.application.port.in;

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
        String description) {
}
