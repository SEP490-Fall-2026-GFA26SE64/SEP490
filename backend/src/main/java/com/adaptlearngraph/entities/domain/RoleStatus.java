package com.adaptlearngraph.entities.domain;

public enum RoleStatus {
    DRAFT,
    SENT,
    SUBMITTED,
    REJECTED,
    ACTIVE,
    PUBLISHED,
    UNPUBLISHED;

    public static RoleStatus fromString(String status) {
        if (status == null || status.isBlank()) {
            return DRAFT;
        }
        String upper = status.trim().toUpperCase();
        if ("UNPUBLISH".equals(upper)) {
            return UNPUBLISHED;
        }
        return RoleStatus.valueOf(upper);
    }
}
