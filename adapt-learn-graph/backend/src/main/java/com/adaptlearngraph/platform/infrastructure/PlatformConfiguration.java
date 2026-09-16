package com.adaptlearngraph.platform.infrastructure;

import com.adaptlearngraph.platform.application.SystemStatusService;
import com.adaptlearngraph.platform.application.port.out.BuildInformationPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class PlatformConfiguration {
    @Bean
    SystemStatusService systemStatusService(BuildInformationPort buildInformation) {
        return new SystemStatusService(buildInformation);
    }
}