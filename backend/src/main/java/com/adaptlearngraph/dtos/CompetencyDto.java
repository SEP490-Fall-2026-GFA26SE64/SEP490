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
            String departmentId,
            String departmentName,
            String jobPositionCode,
            String jobPositionTitle,
            List<MemberSkillResponse> memberSkills,
            int memberSkillCount,
            String createdAt,
            String updatedAt
    ) {
        public CompetencyResponse(
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
        ) {
            this(id, code, name, description, attainmentRule, status, version, levelId, levelName, roleName,
                    null, null, null, null, memberSkills, memberSkillCount, null, null);
        }

        public CompetencyResponse(
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
                List<MemberSkillResponse> memberSkills,
                int memberSkillCount
        ) {
            this(id, code, name, description, attainmentRule, status, version, levelId, levelName, roleName,
                    departmentId, departmentName, jobPositionCode, jobPositionTitle, memberSkills, memberSkillCount, null, null);
        }
    }

    public record MemberSkillResponse(String id, String code, String name) {}

    public record CreateCompetencyRequest(
            String code,
            String name,
            String description,
            String levelId,
            String departmentId,
            String departmentName,
            String jobPositionCode,
            String jobPositionTitle,
            List<String> skillIds
    ) {
        public CreateCompetencyRequest(String code, String name, String description, String levelId, List<String> skillIds) {
            this(code, name, description, levelId, null, null, null, null, skillIds);
        }
    }

    public record UpdateCompetencyRequest(
            String code,
            String name,
            String description,
            String departmentId,
            String departmentName,
            String jobPositionCode,
            String jobPositionTitle,
            List<String> skillIds
    ) {
        public UpdateCompetencyRequest(String code, String name, String description, List<String> skillIds) {
            this(code, name, description, null, null, null, null, skillIds);
        }
    }
}
