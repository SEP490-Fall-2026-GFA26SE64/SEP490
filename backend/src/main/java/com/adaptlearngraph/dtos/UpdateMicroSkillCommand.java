package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.SkillStatus;

public record UpdateMicroSkillCommand(
        String organizationId,
        String skillId,
        String name,
        String description,
        String macroCompetencyCode,
        SkillStatus status,
        com.adaptlearngraph.entities.domain.SkillProvision provision,
        String expectedVersion) {
    public UpdateMicroSkillCommand(String organizationId,String skillId,String name,String description,String macroCompetencyCode,SkillStatus status) {
        this(organizationId,skillId,name,description,macroCompetencyCode,status,null,null);
    }
}
