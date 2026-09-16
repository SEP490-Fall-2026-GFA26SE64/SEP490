package com.adaptlearngraph.platform.application;

import com.adaptlearngraph.platform.application.port.out.BuildInformationPort;
import com.adaptlearngraph.platform.domain.SystemStatus;

public final class SystemStatusService {
    private final BuildInformationPort buildInformation;

    public SystemStatusService(BuildInformationPort buildInformation) {
        this.buildInformation = buildInformation;
    }

    public SystemStatus getStatus() {
        return buildInformation.read();
    }
}