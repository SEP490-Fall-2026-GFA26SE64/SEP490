package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase.Tuple;
import com.adaptlearngraph.entities.AdaptiveBlueprint.Scope;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public interface WorkspaceBaselineResourcePort {
    <T> T locked(Scope scope, Supplier<T> work);
    Tuple read(Scope scope);
    Optional<AdaptiveBlueprintEligibilityPort.Snapshot> candidate(Scope scope, Tuple desired);
    void replace(Scope scope, Tuple expected, Tuple desired, UUID actor);
}
