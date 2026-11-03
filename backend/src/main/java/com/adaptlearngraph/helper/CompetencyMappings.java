package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.CompetencyDto.CompetencyResponse;
import com.adaptlearngraph.dtos.CompetencyDto.MemberSkillResponse;
import com.adaptlearngraph.entities.domain.CompetencyRecord;
import org.modelmapper.ModelMapper;

/** TypeMaps for the organization competency catalog API. */
public final class CompetencyMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(CompetencyRecord.MemberSkill.class, MemberSkillResponse.class).setConverter(context -> {
            CompetencyRecord.MemberSkill source = context.getSource();
            return new MemberSkillResponse(source.id(), source.code(), source.name());
        });
        mapper.typeMap(CompetencyRecord.class, CompetencyResponse.class).setConverter(context -> {
            CompetencyRecord source = context.getSource();
            var memberSkills = source.memberSkills() == null ? null : source.memberSkills().stream()
                    .map(skill -> skill == null ? null
                            : context.getMappingEngine().map(context.create(skill, MemberSkillResponse.class)))
                    .toList();
            return new CompetencyResponse(
                    source.id(),
                    source.code(),
                    source.name(),
                    source.description(),
                    source.attainmentRule(),
                    source.status(),
                    source.version(),
                    source.levelId(),
                    source.levelName(),
                    source.roleName(),
                    memberSkills,
                    source.memberSkills() != null ? source.memberSkills().size() : 0);
        });
    }
}