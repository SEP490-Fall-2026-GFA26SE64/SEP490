package com.adaptlearngraph.catalog.application.port.out;

import com.adaptlearngraph.catalog.application.EmployeeActorContext;
import java.util.Optional;

public interface EmployeeContextPort {
    Optional<EmployeeActorContext> currentActor();
}
