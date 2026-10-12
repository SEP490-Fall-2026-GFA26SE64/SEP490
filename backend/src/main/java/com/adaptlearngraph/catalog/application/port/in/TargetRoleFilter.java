package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;

public record TargetRoleFilter(
        String search,
        RoleTrack track,
        RoleStatus status,
        String domainCode,
        String assignedExpertId) {

    public TargetRoleFilter(String search, RoleTrack track, RoleStatus status) {
        this(search, track, status, null, null);
    }

    public static TargetRoleFilter empty() {
        return new TargetRoleFilter(null, null, null, null, null);
    }
}

