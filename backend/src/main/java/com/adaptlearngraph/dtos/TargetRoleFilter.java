package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.RoleStatus;

public record TargetRoleFilter(
        String search,
        RoleStatus status,
        String assignedExpertId) {

    public TargetRoleFilter(String search, RoleStatus status) {
        this(search, status, null);
    }

    public static TargetRoleFilter empty() {
        return new TargetRoleFilter(null, null, null);
    }
}
