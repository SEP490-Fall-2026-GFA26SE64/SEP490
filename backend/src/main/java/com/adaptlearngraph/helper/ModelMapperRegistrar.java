package com.adaptlearngraph.helper;

import org.modelmapper.ModelMapper;

/** Registers explicit TypeMaps on the shared ModelMapper before it is validated at startup. */
@FunctionalInterface
public interface ModelMapperRegistrar {
    void register(ModelMapper mapper);
}
