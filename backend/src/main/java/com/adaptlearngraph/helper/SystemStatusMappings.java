package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.SystemStatusResponse;
import com.adaptlearngraph.entities.domain.SystemStatus;
import org.modelmapper.ModelMapper;

/** TypeMaps for the public system status endpoint. */
public final class SystemStatusMappings implements ModelMapperRegistrar {
    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(SystemStatus.class, SystemStatusResponse.class).setConverter(context -> {
            SystemStatus source = context.getSource();
            return new SystemStatusResponse(source.application(), source.version(), source.stage());
        });
    }
}
