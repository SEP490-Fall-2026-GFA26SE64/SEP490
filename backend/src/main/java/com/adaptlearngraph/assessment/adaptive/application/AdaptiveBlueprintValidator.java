package com.adaptlearngraph.assessment.adaptive.application;

import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort.Snapshot;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Configuration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/** Shared save/test/finalize rules. Numerical minimum-evidence/SE policy belongs to the later typed engine. */
public final class AdaptiveBlueprintValidator {
    public List<Shortage> shortages(Configuration configuration, Snapshot eligible) {
        if (eligible.roles().isEmpty() || !configuration.roles().keySet().equals(eligible.roles().keySet())) {
            throw new Failure(Code.BLUEPRINT_STALE, "Configuration must contain exactly the current active roles", List.of());
        }
        var shortages = new ArrayList<Shortage>();
        Set<UUID> covered = eligible.explorationItemVersionIds();
        var missing = new HashSet<UUID>();
        eligible.roles().values().forEach(role -> missing.addAll(role.missingParameterItemVersionIds()));
        if (!java.util.Collections.disjoint(covered, missing)) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, "Inconsistent parameter coverage across roles", List.of());
        }
        append(shortages, Optional.empty(), configuration.exploration().maxQuestions(), covered, missing);
        new TreeMap<>(eligible.roles()).forEach((id, role) -> append(shortages, Optional.of(id),
                configuration.roles().get(id).maxQuestions(), role.itemVersionIds(), role.missingParameterItemVersionIds()));
        return List.copyOf(shortages);
    }

    public void requireFeasible(Configuration configuration, Snapshot eligible) {
        List<Shortage> shortages = shortages(configuration, eligible);
        if (!shortages.isEmpty()) {
            Code code = shortages.stream().anyMatch(shortage -> shortage.kind() == ShortageKind.ITEM_CAPACITY)
                    ? Code.INSUFFICIENT_CAPACITY : Code.PARAMETER_COVERAGE_MISSING;
            throw new Failure(code, "Blueprint exceeds current eligible capacity", shortages);
        }
    }

    private static void append(List<Shortage> result, Optional<String> role, int required, Set<UUID> covered, Set<UUID> missing) {
        int total = Math.addExact(covered.size(), missing.size());
        if (total < required) result.add(new Shortage(role, ShortageKind.ITEM_CAPACITY, required, total));
        if (covered.size() < required && !missing.isEmpty()) {
            result.add(new Shortage(role, ShortageKind.PARAMETER_COVERAGE, required, covered.size()));
        }
    }
}
