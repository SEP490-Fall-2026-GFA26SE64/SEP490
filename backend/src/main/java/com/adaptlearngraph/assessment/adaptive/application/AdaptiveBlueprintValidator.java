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
import java.util.stream.Collectors;

/** Feasibility over server-owned eligibility and pinned limits; never shrinks the union to fit a budget. */
public final class AdaptiveBlueprintValidator {
    public List<Shortage> shortages(Configuration configuration, Snapshot eligible) {
        boolean full = configuration.occupationBounds() != null;
        if (eligible.roles().isEmpty() || (!full && !configuration.roles().keySet().equals(eligible.roles().keySet()))) {
            throw new Failure(Code.BLUEPRINT_STALE, "Configuration must contain exactly the current active roles", List.of());
        }
        var shortages = new ArrayList<Shortage>();
        Set<UUID> covered = eligible.explorationItemVersionIds();
        var missing = new HashSet<UUID>();
        eligible.roles().values().forEach(role -> missing.addAll(role.missingParameterItemVersionIds()));
        if (!java.util.Collections.disjoint(covered, missing)) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, "Inconsistent parameter coverage across roles", List.of());
        }
        int maximum = configuration.bounds(Optional.empty()).maxQuestions();
        append(shortages, Optional.empty(), maximum, covered, missing);
        if (full) appendFullCoverage(shortages, maximum, eligible, covered, missing);
        else new TreeMap<>(eligible.roles()).forEach((id, role) -> append(shortages, Optional.of(id),
                configuration.roles().get(id).maxQuestions(), role.itemVersionIds(), role.missingParameterItemVersionIds()));
        return List.copyOf(shortages);
    }

    public void requireFeasible(Configuration configuration, Snapshot eligible) {
        List<Shortage> shortages = shortages(configuration, eligible);
        if (!shortages.isEmpty()) {
            Code code = shortages.stream().anyMatch(shortage -> shortage.kind() != ShortageKind.PARAMETER_COVERAGE)
                    ? Code.INSUFFICIENT_CAPACITY : Code.PARAMETER_COVERAGE_MISSING;
            throw new Failure(code, "Blueprint exceeds current eligible capacity", shortages);
        }
    }

    private static void appendFullCoverage(List<Shortage> result, int maximum, Snapshot eligible,
                                            Set<UUID> covered, Set<UUID> missing) {
        var coverage = eligible.coverage();
        var published = new HashSet<>(covered); published.addAll(missing);
        if (coverage == null || !published.equals(coverage.publishedItemSkills().keySet())) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, "Pinned union coverage unavailable", List.of());
        }
        var skills = eligible.roles().values().stream().flatMap(role -> role.role().skills().keySet().stream())
                .collect(Collectors.toCollection(java.util.TreeSet::new));
        var snapshots = new java.util.HashMap<String, com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.SkillSnapshot>();
        eligible.roles().values().forEach(role -> role.role().skills().forEach((id, snapshot) -> {
            var previous = snapshots.putIfAbsent(id, snapshot);
            if (previous != null && !previous.equals(snapshot)) {
                throw new Failure(Code.DEPENDENCY_UNAVAILABLE, "Inconsistent shared skill snapshot", List.of());
            }
        }));
        if (skills.isEmpty() || eligible.roles().values().stream().anyMatch(role ->
                java.util.stream.Stream.concat(role.itemVersionIds().stream(), role.missingParameterItemVersionIds().stream())
                        .anyMatch(id -> !role.role().skills().containsKey(coverage.publishedItemSkills().get(id))))) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE, "Inconsistent union skill membership", List.of());
        }
        long minimum = (long) skills.size() * coverage.minimumPerSkill();
        if (minimum > Integer.MAX_VALUE) {
            throw new Failure(Code.INSUFFICIENT_CAPACITY, "Minimum union coverage exceeds supported question count", List.of());
        }
        if (maximum < minimum) result.add(new Shortage(Optional.empty(), ShortageKind.MINIMUM_QUESTIONS, (int) minimum, maximum));
        if (maximum > coverage.modelMaxResponses()) {
            result.add(new Shortage(Optional.empty(), ShortageKind.MODEL_LIMIT, maximum, coverage.modelMaxResponses()));
        }
        for (String skill : skills) {
            int available = (int) covered.stream().filter(id -> skill.equals(coverage.publishedItemSkills().get(id))).count();
            if (available < coverage.minimumPerSkill()) result.add(new Shortage(Optional.empty(), ShortageKind.SKILL_COVERAGE,
                    coverage.minimumPerSkill(), available, Optional.of(skill)));
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
