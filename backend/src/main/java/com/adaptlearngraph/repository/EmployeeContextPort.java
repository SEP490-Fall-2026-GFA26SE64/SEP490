package com.adaptlearngraph.repository;

import com.adaptlearngraph.dtos.EmployeeActorContext;
import java.util.Optional;

public interface EmployeeContextPort {
    Optional<EmployeeActorContext> currentActor();
}
