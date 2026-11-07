package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.MicroSkillResponse;
import com.adaptlearngraph.dtos.PrerequisiteResponse;
import com.adaptlearngraph.entities.domain.MicroSkill;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import org.modelmapper.ModelMapper;

/** TypeMaps for the micro-skill and prerequisite catalog APIs. */
public final class MicroSkillMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(MicroSkill.class, MicroSkillResponse.class).setConverter(context -> {
            MicroSkill source = context.getSource();
            return new MicroSkillResponse(
                    source.getId().toString(),
                    source.getOrganizationId(),
                    source.getCode(),
                    source.getName(),
                    source.getDescription(),
                    source.getStatus().name(),
                    source.getCreatedAt(),
                    source.getUpdatedAt());
        });
        mapper.typeMap(PrerequisiteEdge.class, PrerequisiteResponse.class)
                .setConverter(context -> PrerequisiteResponse.fromDomain(context.getSource()));
    }
}