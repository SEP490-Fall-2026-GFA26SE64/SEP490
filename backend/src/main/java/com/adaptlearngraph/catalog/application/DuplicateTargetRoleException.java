package com.adaptlearngraph.catalog.application;

public class DuplicateTargetRoleException extends RuntimeException {
    private final String organizationId;
    private final String code;

    public DuplicateTargetRoleException(String organizationId, String code) {
        super("Target role with code '" + code + "' already exists in organization '" + organizationId + "'");
        this.organizationId = organizationId;
        this.code = code;
    }

    public String getOrganizationId() {
        return organizationId;
    }

    public String getCode() {
        return code;
    }
}
