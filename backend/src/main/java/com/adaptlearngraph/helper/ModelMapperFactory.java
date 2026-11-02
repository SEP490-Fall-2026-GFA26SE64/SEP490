package com.adaptlearngraph.helper;

import java.util.Collection;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.modelmapper.record.RecordModule;

/** Builds the single ModelMapper configuration used by the application and by mapping tests. */
public final class ModelMapperFactory {
    private ModelMapperFactory() {
    }

    public static ModelMapper create(Collection<? extends ModelMapperRegistrar> registrars) {
        var mapper = new ModelMapper();
        mapper.registerModule(new RecordModule());
        mapper.getConfiguration()
                .setMatchingStrategy(MatchingStrategies.STRICT)
                .setSkipNullEnabled(false)
                .setAmbiguityIgnored(false)
                .setImplicitMappingEnabled(true);
        registrars.forEach(registrar -> registrar.register(mapper));
        mapper.validate();
        return mapper;
    }
}
