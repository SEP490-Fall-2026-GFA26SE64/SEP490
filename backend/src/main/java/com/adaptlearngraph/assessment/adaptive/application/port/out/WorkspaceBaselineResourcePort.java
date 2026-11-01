package com.adaptlearngraph.assessment.adaptive.application.port.out;

import com.adaptlearngraph.assessment.adaptive.application.port.in.WorkspaceBaselineResourceUseCase.Tuple;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public interface WorkspaceBaselineResourcePort {
    <T> T locked(Scope scope, Supplier<T> work);
    Tuple read(Scope scope);
    Optional<AdaptiveBlueprintEligibilityPort.Snapshot> candidate(Scope scope, Tuple desired);
    void replace(Scope scope, Tuple expected, Tuple desired, UUID actor);
}
