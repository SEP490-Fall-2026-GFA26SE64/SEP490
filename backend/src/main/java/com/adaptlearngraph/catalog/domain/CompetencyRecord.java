package com.adaptlearngraph.catalog.domain;

import java.util.List;

public record CompetencyRecord(
        String id,
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
    public record MemberSkill(String id, String code, String name) {}
}
