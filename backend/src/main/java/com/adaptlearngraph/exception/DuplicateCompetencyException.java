package com.adaptlearngraph.exception;

public class DuplicateCompetencyException extends RuntimeException {
    private final String organizationId;
    private final String code;

    public DuplicateCompetencyException(String organizationId, String code) {
        super("Competency with code '" + code + "' already exists in organization '" + organizationId + "'");
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

