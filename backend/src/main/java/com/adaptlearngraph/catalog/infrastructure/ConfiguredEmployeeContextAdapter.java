package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.EmployeeActorContext;
import com.adaptlearngraph.catalog.application.port.out.EmployeeContextPort;
import java.util.Optional;
import java.util.Set;

final class ConfiguredEmployeeContextAdapter implements EmployeeContextPort {
    private final EmployeeActorContext actor;

    ConfiguredEmployeeContextAdapter(LocalEmployeeContextProperties properties) {
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
