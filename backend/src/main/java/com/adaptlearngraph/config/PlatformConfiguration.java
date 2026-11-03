package com.adaptlearngraph.config;

import com.adaptlearngraph.helper.ModelMapperRegistrar;
import com.adaptlearngraph.helper.SystemStatusMappings;
import com.adaptlearngraph.services.SystemStatusService;
import com.adaptlearngraph.repository.BuildInformationPort;
import org.modelmapper.ModelMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

@Configuration(proxyBeanMethods = false)
@Import(ModelMapperConfiguration.class)
public class PlatformConfiguration {
    @Bean
    SystemStatusService systemStatusService(BuildInformationPort buildInformation, ModelMapper modelMapper) {
        return new SystemStatusService(buildInformation, modelMapper);
    }

    @Bean
    ModelMapperRegistrar systemStatusMappings() {
        return new SystemStatusMappings();
    }
}