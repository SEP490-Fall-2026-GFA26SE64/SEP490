package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.AdaptiveBlueprintActorPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.WorkspaceBaselineResourcePort;
import com.adaptlearngraph.entities.AdaptiveBlueprint.Scope;
import java.util.Set;
import java.util.stream.Collectors;

/** Resource identity/CAS only. Start, scoring, retake and immutable evidence remain with their owners. */
public final class WorkspaceBaselineResourceService implements WorkspaceBaselineResourceUseCase {
    private final AdaptiveBlueprintActorPort actors;
    private final WorkspaceBaselineResourcePort resources;
    public WorkspaceBaselineResourceService(AdaptiveBlueprintActorPort actors, WorkspaceBaselineResourcePort resources) {
        this.actors=actors; this.resources=resources;
    }
    private AdaptiveBlueprintActorPort.Actor authorize(String occupation) {
        var actor=actors.currentActor().orElseThrow(()->new Failure(401,"UNAUTHENTICATED"));
        if (!actor.isActiveLdManager() || !actors.authorizedOccupations(actor).contains(occupation))
            throw new Failure(403,"FORBIDDEN");
        return actor;
    }
    @Override public Tuple read(String occupation) {
        var actor=authorize(occupation);
        return resources.read(new Scope(actor.organizationId(),occupation));
    }
    @Override public Tuple configure(String occupation, Tuple expected, Tuple desired) {
        var actor=authorize(occupation);
        if (expected==null || desired==null || !desired.complete()) throw new Failure(400,"INVALID_REQUEST");
        var scope=new Scope(actor.organizationId(),occupation);
        return resources.locked(scope,()-> {
            if (!actor.equals(authorize(occupation))) throw new Failure(403,"FORBIDDEN");
            var current=resources.read(scope);
            if (current.equals(desired)) return current; // Idempotent PUT; never repins a learner artifact.
            if (!current.equals(expected)) throw new Failure(409,"STALE_RESOURCE_BINDING");
            var candidate=resources.candidate(scope,desired).orElseThrow(()->new Failure(503,"DEPENDENCY_UNAVAILABLE"));
            if (!scope.equals(candidate.scope()) || !hasCoverage(candidate)) throw new Failure(503,"DEPENDENCY_UNAVAILABLE");
            resources.replace(scope,expected,desired,actor.accountId());
            return desired;
        });
    }
    public static boolean hasCoverage(AdaptiveBlueprintEligibilityPort.Snapshot eligible) {
        var coverage=eligible.coverage();
        Set<String> skills=eligible.roles().values().stream().flatMap(r->r.role().skills().keySet().stream()).collect(Collectors.toSet());
        if (skills.isEmpty() || coverage==null || (long)skills.size()*coverage.minimumPerSkill()>coverage.modelMaxResponses()) return false;
        var items=eligible.explorationItemVersionIds();
        return skills.stream().allMatch(skill->items.stream().filter(item->skill.equals(coverage.publishedItemSkills().get(item)))
                .count()>=coverage.minimumPerSkill());
    }
}
