package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.domain.CompetencyRecord;
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
            List<CompetencyRecord.MemberSkill> memberSkills,
            int memberSkillCount
    ) {
        public static CompetencyResponse fromDomain(CompetencyRecord record) {
            return new CompetencyResponse(
                    record.id(),
                    record.code(),
                    record.name(),
                    record.description(),
                    record.attainmentRule(),
                    record.status(),
                    record.version(),
                    record.levelId(),
                    record.levelName(),
                    record.roleName(),
                    record.memberSkills(),
                    record.memberSkills() != null ? record.memberSkills().size() : 0
            );
        }
    }

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
