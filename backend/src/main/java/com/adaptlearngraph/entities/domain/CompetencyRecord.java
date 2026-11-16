package com.adaptlearngraph.entities.domain;

import java.util.List;

public record CompetencyRecord(
        String id,
        String code,
        String name,
        String description,
        String attainmentRule,
        String status,
        String version,
        String levelId,
        String levelName,
        String roleName,
        String departmentId,
        String departmentName,
        String jobPositionCode,
        String jobPositionTitle,
        List<MemberSkill> memberSkills,
        String createdAt,
        String updatedAt
) {
    public record MemberSkill(String id, String code, String name) {}

    public CompetencyRecord(
            String id,
            String code,
            String name,
            String description,
            String attainmentRule,
            String status,
            String version,
            String levelId,
            String levelName,
            String roleName,
            List<MemberSkill> memberSkills
    ) {
        this(id, code, name, description, attainmentRule, status, version, levelId, levelName, roleName,
                null, null, null, null, memberSkills, null, null);
    }

    public CompetencyRecord(
            String id,
            String code,
            String name,
            String description,
            String attainmentRule,
            String status,
            String version,
            String levelId,
            String levelName,
            String roleName,
            String departmentId,
            String departmentName,
            String jobPositionCode,
            String jobPositionTitle,
            List<MemberSkill> memberSkills
    ) {
        this(id, code, name, description, attainmentRule, status, version, levelId, levelName, roleName,
                departmentId, departmentName, jobPositionCode, jobPositionTitle, memberSkills, null, null);
    }
}
