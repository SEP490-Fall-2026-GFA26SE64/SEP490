package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Dependency;
import java.util.*;

/** Reusable content/start/segment hook; actual owner routes must call it on each protected access. */
public final class InitialPathwayAccess {
    private final Actors actors;private final Coordination coordination;private final InitialPathwayStore store;
    private final ReviewAssignments assignments;private final Bindings bindings;private final Availability availability;
    private final LiveReadiness readiness;private final ContentAccess content;
    public InitialPathwayAccess(Actors actors,Coordination coordination,InitialPathwayStore store,ReviewAssignments assignments,
            Bindings bindings,Availability availability,LiveReadiness readiness,ContentAccess content) {
        this.actors=actors;this.coordination=coordination;this.store=store;this.assignments=assignments;this.bindings=bindings;
        this.availability=availability;this.readiness=readiness;this.content=content;
    }
    public String requireEntry(UUID pathwayId,String moduleId) {
        InitialPathwayPorts.text(moduleId);
        var scope=Scope.own(actors.require());var r=requireApproved(scope,pathwayId);var revision=store.revision(scope,pathwayId,r.revision());
        var module=revision.plan().modules().stream().filter(m->m.id().equals(moduleId)).findFirst().orElseThrow(()->new Failure(404,"MODULE_NOT_FOUND"));
        availability.requireAvailable(scope,moduleId,module.contentVersion());
        var gates=revision.plan().dependencies().stream().filter(g->g.moduleId().equals(moduleId)).toList();
        for(var gate:gates) if(!moduleId.equals(gate.providerModuleId()) && !readiness.passed(scope,gate))throw new Failure(423,"PREREQUISITE_NOT_READY");
        var internal=gates.stream().filter(g->moduleId.equals(g.providerModuleId())).toList();
        String entry=content.requireEntry(scope,moduleId,module.contentVersion(),internal);
        if(entry==null || !entry.startsWith("/") || entry.startsWith("//") || entry.contains("\\"))throw new Failure(503,"CONTENT_ACCESS_UNAVAILABLE");
        return entry;
    }
    public void requireSegment(UUID pathwayId,String moduleId,String internalGateId) {
        InitialPathwayPorts.text(moduleId);InitialPathwayPorts.text(internalGateId);
        var scope=Scope.own(actors.require());var r=requireApproved(scope,pathwayId);var revision=store.revision(scope,pathwayId,r.revision());
        var module=revision.plan().modules().stream().filter(m->m.id().equals(moduleId)).findFirst().orElseThrow(()->new Failure(404,"MODULE_NOT_FOUND"));
        availability.requireAvailable(scope,moduleId,module.contentVersion());
        var matching=revision.plan().dependencies().stream().filter(g->g.moduleId().equals(moduleId)
                && (g.internalGateId()==null || Objects.equals(g.internalGateId(),internalGateId))).toList();
        if(matching.stream().noneMatch(g->Objects.equals(g.internalGateId(),internalGateId)))throw new Failure(404,"GATE_NOT_FOUND");
        for(Dependency gate:matching)if(!readiness.passed(scope,gate))throw new Failure(423,"PREREQUISITE_NOT_READY");
    }
    private Request requireApproved(Scope scope,UUID id) {
        var r=store.request(scope,id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        if(r.review()!=Review.APPROVED || r.validation()!=Validation.VALID || r.revision()==null
                || !coordination.current(scope).filter(r.selection()::equals).isPresent()
                || !store.current(scope).filter(current->current.id().equals(id) && Objects.equals(current.revision(),r.revision())
                        && Objects.equals(current.contentHash(),r.contentHash()) && current.review()==Review.APPROVED).isPresent()
                || !store.approved(scope,id,r.revision(),r.contentHash()))throw new Failure(403,"PATHWAY_NOT_APPROVED");
        assignments.requireApprovalValid(scope,id,r.revision(),r.contentHash());bindings.assertCurrent(scope,r.frozen().input().binding());return r;
    }
}
