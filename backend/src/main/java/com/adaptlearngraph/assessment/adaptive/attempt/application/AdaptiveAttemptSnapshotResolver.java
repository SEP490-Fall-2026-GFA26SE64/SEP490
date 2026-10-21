package com.adaptlearngraph.assessment.adaptive.attempt.application;

import com.adaptlearngraph.assessment.adaptive.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import java.util.*;
import java.util.stream.Collectors;

/** New-start validation only, under the caller's transaction and Blueprint identity share lock. */
public final class AdaptiveAttemptSnapshotResolver {
    private final AdaptiveBlueprintStore blueprints;
    private final AdaptiveBlueprintEligibilityPort eligibility;
    private final AdaptiveTechnicalVersionPort technical;
    public AdaptiveAttemptSnapshotResolver(AdaptiveBlueprintStore blueprints, AdaptiveBlueprintEligibilityPort eligibility,
                                            AdaptiveTechnicalVersionPort technical) {
        this.blueprints = blueprints; this.eligibility = eligibility; this.technical = technical;
    }
    public AdaptiveAttemptSnapshot resolve(AdaptiveAttempt.Scope scope, Optional<String> role, Optional<Long> selectionRevision) {
        var catalogScope = new AdaptiveBlueprint.Scope(scope.organizationId(), scope.occupationId());
        var current = blueprints.findActivation(catalogScope).flatMap(AdaptiveBlueprint.Activation::current)
                .flatMap(id -> blueprints.findVersion(catalogScope, id)).orElseThrow(() -> new Failure(Code.BLUEPRINT_UNAVAILABLE));
        var eligible = eligibility.resolvePinned(catalogScope, current.pins()).orElseThrow(() -> new Failure(Code.FORBIDDEN));
        var roles = eligible.roles().entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().role()));
        if (!eligible.scope().equals(catalogScope) || !eligible.pins().equals(current.pins())
                || !current.catalogFingerprint().equals(eligible.catalogFingerprint()) || !current.roles().equals(roles)) {
            throw new Failure(Code.BLUEPRINT_STALE);
        }
        if (role.filter(id -> !roles.containsKey(id)).isPresent()) throw new Failure(Code.BLUEPRINT_STALE);
        Set<String> skills = role.map(id -> roles.get(id).skills().keySet()).orElseGet(() -> roles.values().stream()
                .flatMap(r -> r.skills().keySet().stream()).collect(Collectors.toSet()));
        Set<UUID> ids = role.map(id -> eligible.roles().get(id).itemVersionIds()).orElseGet(eligible::explorationItemVersionIds);
        Map<UUID, String> pool = new HashMap<>();
        for (var item : technical.findParameters(current.pins(), skills)) {
            if (ids.contains(item.itemVersionId()) && pool.putIfAbsent(item.itemVersionId(), item.microSkillId()) != null) {
                throw new Failure(Code.POLICY_UNAVAILABLE);
            }
        }
        int maximum = role.map(id -> current.configuration().roles().get(id)).orElse(current.configuration().exploration()).maxQuestions();
        if (!pool.keySet().equals(ids) || pool.size() < maximum || skills.isEmpty()) throw new Failure(Code.INFEASIBLE_SCOPE);
        return new AdaptiveAttemptSnapshot(current, role.isPresent() ? AdaptiveAttemptSnapshot.Purpose.ROLE_REQUIREMENT
                : AdaptiveAttemptSnapshot.Purpose.OCCUPATION_EXPLORATION, role, selectionRevision, pool);
    }
}
