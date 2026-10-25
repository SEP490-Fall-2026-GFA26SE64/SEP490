package com.adaptlearngraph.catalog.domain;

public enum RoleStatus {
    DRAFT,
    SENT,
    SUBMITTED,
    REJECTED,
    ACTIVE,
    RETIRED;

    public static RoleStatus fromString(String status) {
        if (status == null || status.isBlank()) {
            return DRAFT;
        }
        String upper = status.trim().toUpperCase();
        if ("PUBLISHED".equals(upper)) {
            return ACTIVE;
        }
        return RoleStatus.valueOf(upper);
    }
}
