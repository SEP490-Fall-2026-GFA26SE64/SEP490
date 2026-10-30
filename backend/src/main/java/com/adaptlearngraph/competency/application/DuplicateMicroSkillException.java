package com.adaptlearngraph.competency.application;

public class DuplicateMicroSkillException extends RuntimeException {
    private final String organizationId;
    private final String code;

    public DuplicateMicroSkillException(String organizationId, String code) {
        super("Micro-skill with code '" + code + "' already exists in organization '" + organizationId + "'");
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
