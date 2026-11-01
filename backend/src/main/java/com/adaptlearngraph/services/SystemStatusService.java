package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.BuildInformationPort;
import com.adaptlearngraph.entities.SystemStatus;

public final class SystemStatusService {
    private final BuildInformationPort buildInformation;

    public SystemStatusService(BuildInformationPort buildInformation) {
        this.buildInformation = buildInformation;
    }

    public SystemStatus getStatus() {
        return buildInformation.read();
    }
}