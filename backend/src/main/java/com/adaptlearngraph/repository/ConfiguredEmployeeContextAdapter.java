package com.adaptlearngraph.repository;

import com.adaptlearngraph.config.LocalEmployeeContextProperties;
import com.adaptlearngraph.dtos.EmployeeActorContext;
import java.util.Optional;
import java.util.Set;

public final class ConfiguredEmployeeContextAdapter implements EmployeeContextPort {
    private final EmployeeActorContext actor;

    public ConfiguredEmployeeContextAdapter(LocalEmployeeContextProperties properties) {
        actor = new EmployeeActorContext(
                properties.accountId(),
                properties.organizationId(),
                properties.active(),
                Set.of(properties.role()));
    }

    @Override
    public Optional<EmployeeActorContext> currentActor() {
        return Optional.of(actor);
    }
}
