package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.InitialPathwayDto.OutcomeResponse;
import com.adaptlearngraph.repository.InitialPathwayPorts.Receipt;
import org.modelmapper.ModelMapper;

/** TypeMaps for the initial-pathway command API; the retained request hash stays server-side. */
public final class InitialPathwayMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(Receipt.class, OutcomeResponse.class).setConverter(context ->
                new OutcomeResponse(context.getSource().status(), context.getSource().responseJson()));
    }
}