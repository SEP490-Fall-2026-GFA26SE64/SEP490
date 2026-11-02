package com.adaptlearngraph.config;

import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModelMapperRegistrar;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Shared STRICT ModelMapper; startup fails when any registered TypeMap leaves a destination property unmapped. */
@Configuration(proxyBeanMethods = false)
public class ModelMapperConfiguration {
    @Bean
    ModelMapper modelMapper(ObjectProvider<ModelMapperRegistrar> registrars) {
        return ModelMapperFactory.create(registrars.orderedStream().toList());
    }
}
