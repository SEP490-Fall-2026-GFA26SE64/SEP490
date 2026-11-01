package com.adaptlearngraph.config;

import com.adaptlearngraph.services.SystemStatusService;
import com.adaptlearngraph.repository.BuildInformationPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class PlatformConfiguration {
    @Bean
    SystemStatusService systemStatusService(BuildInformationPort buildInformation) {
        return new SystemStatusService(buildInformation);
    }
}