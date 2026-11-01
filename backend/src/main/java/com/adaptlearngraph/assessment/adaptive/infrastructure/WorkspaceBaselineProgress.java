package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import com.adaptlearngraph.learning.application.RoleBaselineFlow.*;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/** Workspace-only readiness projection; the original profile/attempt owner retains precedence. */
final class WorkspaceBaselineProgress implements Baseline {
    private final Baseline profiles;
    private final AdaptiveBlueprintEligibilityPort eligibility;

    WorkspaceBaselineProgress(Baseline profiles, AdaptiveBlueprintEligibilityPort eligibility) {
        this.profiles = profiles;
        this.eligibility = eligibility;
    }

    @Override public List<MasteryProfile> mastery(Actor actor) { return profiles.mastery(actor); }
    @Override public Optional<Progress> active(Actor actor) { return profiles.active(actor); }

    @Override public Progress progress(Actor actor, Role role, Set<String> requiredSkills) {
        var progress = profiles.progress(actor, role, requiredSkills);
        if (!"NO_BASELINE".equals(progress.state())) return progress;
        var scope = new Scope(actor.organizationId(), role.occupationId());
        try {
            if (eligibility.resolve(scope).filter(snapshot -> usable(snapshot, scope, role.id(), requiredSkills)).isPresent()) {
                return progress;
            }
        } catch (AdaptiveBlueprintEligibilityPort.DependencyUnavailable unavailable) {
            // A source outage is resource-unavailable, never proof of an unconfigured usable baseline.
        }
        return new Progress("BASELINE_UNAVAILABLE", progress.requiredCount(), progress.coveredCount(),
                progress.attemptId(), progress.baselineVersion());
    }

    private static boolean usable(AdaptiveBlueprintEligibilityPort.Snapshot snapshot, Scope scope,
                                  String roleId, Set<String> requiredSkills) {
        if (!scope.equals(snapshot.scope()) || !snapshot.roles().containsKey(roleId)) return false;
        var skills = snapshot.roles().values().stream().flatMap(pool -> pool.role().skills().keySet().stream())
                .collect(Collectors.toSet());
        return skills.equals(requiredSkills)
                && com.adaptlearngraph.assessment.adaptive.application.WorkspaceBaselineResourceService.hasCoverage(snapshot);
    }
}
