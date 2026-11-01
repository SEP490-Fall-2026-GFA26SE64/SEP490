package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.RoleStatus;
import com.adaptlearngraph.entities.RoleTrack;

public record TargetRoleFilter(
        String search,
        RoleTrack track,
        RoleStatus status,
        String assignedExpertId) {

    public TargetRoleFilter(String search, RoleTrack track, RoleStatus status) {
        this(search, track, status, null);
    }

    public static TargetRoleFilter empty() {
        return new TargetRoleFilter(null, null, null, null);
    }
}
