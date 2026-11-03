package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.LearningModuleDto.LearningModuleResponse;
import com.adaptlearngraph.entities.domain.LearningModuleRecord;
import org.modelmapper.ModelMapper;

/** TypeMaps for the legacy learning-module catalog API. */
public final class LearningModuleMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(LearningModuleRecord.class, LearningModuleResponse.class).setConverter(context -> {
            LearningModuleRecord source = context.getSource();
            return new LearningModuleResponse(
                    source.id(),
                    source.code(),
                    source.title(),
                    source.moduleType(),
                    source.contentUri(),
                    source.contentType(),
                    source.contentVersion(),
                    source.version(),
                    source.status(),
                    source.reviewStatus(),
                    source.durationMinutes(),
                    source.teachesSkillIds(),
                    source.teachesSkillNames());
        });
    }
}