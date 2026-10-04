package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.catalog.application.EmployeeActorContext;
import com.adaptlearngraph.catalog.application.port.out.EmployeeContextPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Maps the trusted F01 actor context into the F02 application boundary. */
public final class F01TargetSelectionActorAdapter implements TargetSelectionActorPort {
    private final EmployeeContextPort employeeContext;

    public F01TargetSelectionActorAdapter(EmployeeContextPort employeeContext) {
        this.employeeContext = Objects.requireNonNull(employeeContext, "employeeContext must not be null");
    }

    @Override
    public Optional<SelectionActor> currentActor() {
        return employeeContext.currentActor().map(F01TargetSelectionActorAdapter::mapActor);
    }

    private static SelectionActor mapActor(EmployeeActorContext actor) {
        try {
            return new SelectionActor(
                    UUID.fromString(actor.accountId()),
                    UUID.fromString(actor.organizationId()),
                    actor.active(),
                    actor.roles());
        } catch (IllegalArgumentException invalidIdentity) {
            throw new IllegalStateException("Trusted actor context contains an invalid UUID", invalidIdentity);
        }
    }
}
