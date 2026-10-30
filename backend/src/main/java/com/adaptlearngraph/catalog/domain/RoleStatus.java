package com.adaptlearngraph.catalog.domain;

public enum RoleStatus {
    DRAFT,
    SENT,
    SUBMITTED,
    REJECTED,
    ACTIVE,
    PUBLISHED,
    RETIRED;

    public static RoleStatus fromString(String status) {
        if (status == null || status.isBlank()) {
            return DRAFT;
        }
        String upper = status.trim().toUpperCase();
        return RoleStatus.valueOf(upper);
    }
}
