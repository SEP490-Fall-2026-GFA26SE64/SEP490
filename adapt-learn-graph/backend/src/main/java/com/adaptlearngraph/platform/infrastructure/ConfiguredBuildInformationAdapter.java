package com.adaptlearngraph.platform.infrastructure;

import com.adaptlearngraph.platform.application.port.out.BuildInformationPort;
import com.adaptlearngraph.platform.domain.SystemStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public final class ConfiguredBuildInformationAdapter implements BuildInformationPort {
    private final String application;

    public ConfiguredBuildInformationAdapter(@Value("${spring.application.name}") String application) {
        this.application = application;
    }

    @Override
    public SystemStatus read() {
        return new SystemStatus(application, "0.1.0-SNAPSHOT", "SCAFFOLD");
    }
}