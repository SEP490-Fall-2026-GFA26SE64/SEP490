package com.adaptlearngraph.dtos;

import java.util.List;

public class CompetencyDto {
    public record CompetencyResponse(
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
            List<MemberSkillResponse> memberSkills,
            int memberSkillCount
    ) {}

    public record MemberSkillResponse(String id, String code, String name) {}

    public record CreateCompetencyRequest(
            String code,
            String name,
            String description,
            String levelId,
            List<String> skillIds
    ) {}

    public record UpdateCompetencyRequest(
            String code,
            String name,
            String description,
            List<String> skillIds
    ) {}
}