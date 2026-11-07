package com.adaptlearngraph.dtos;

public record CreateMicroSkillCommand(
        String organizationId,
        String code,
        String name,
        String description,
        String macroCompetencyCode,
        com.adaptlearngraph.entities.domain.SkillProvision provision) {
    public CreateMicroSkillCommand(String organizationId,String code,String name,String description,String macroCompetencyCode) {
        this(organizationId,code,name,description,macroCompetencyCode,null);
    }
}
