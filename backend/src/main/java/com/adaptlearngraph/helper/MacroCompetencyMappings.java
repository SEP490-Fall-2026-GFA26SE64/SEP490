package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.MacroCompetencyResponse;
import com.adaptlearngraph.entities.domain.MacroCompetency;
import org.modelmapper.ModelMapper;

/** TypeMaps for the macro-competency catalog API. */
public final class MacroCompetencyMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(MacroCompetency.class, MacroCompetencyResponse.class).setConverter(context -> {
            MacroCompetency source = context.getSource();
            return new MacroCompetencyResponse(
                    source.id(),
                    source.code(),
                    source.name(),
                    source.description(),
                    source.status(),
                    source.createdAt(),
                    source.updatedAt());
        });
    }
}