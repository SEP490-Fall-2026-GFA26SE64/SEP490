package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.SystemStatusResponse;
import com.adaptlearngraph.repository.BuildInformationPort;
import com.adaptlearngraph.entities.domain.SystemStatus;
import java.util.Objects;
import org.modelmapper.ModelMapper;

public final class SystemStatusService {
    private final BuildInformationPort buildInformation;
    private final ModelMapper mapper;

    public SystemStatusService(BuildInformationPort buildInformation, ModelMapper mapper) {
        this.buildInformation = buildInformation;
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public SystemStatus getStatus() {
        return buildInformation.read();
    }

    public SystemStatusResponse status() {
        return mapper.map(getStatus(), SystemStatusResponse.class);
    }
}