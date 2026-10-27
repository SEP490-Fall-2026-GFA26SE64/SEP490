package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Module;
import java.util.*;

/** Employee DTOs never serialize frozen worker input or unapproved module/candidate details. */
public final class InitialPathwayView {
    public record Status(UUID requestId,Generation generationStatus,Review reviewStatus,Validation validationStatus,
                         String displayState,String reasonCode,Long revision,String revisionContentHash,String roleName,String levelName) {}
    public record Target(String skillId,String instructionLevel) {}
    public record ModuleSummary(String id,String title,String contentVersion,int ordinal,java.math.BigDecimal durationMinutes,
                                java.math.BigDecimal priceVnd,List<Target> targets) {}
    public record ModuleView(ModuleSummary module,String accessState,String reasonCode,String entry) {}
    public record DependencyView(String moduleId,String providerModuleId,String dependentSkillId,String prerequisiteSkillId,boolean internal) {}
    public record View(Status status,List<ModuleView> modules,List<DependencyView> dependencies,boolean archived) {}
    private final Actors actors;private final InitialPathwayStore store;private final Coordination coordination;private final InitialPathwayAccess access;
    public InitialPathwayView(Actors actors,InitialPathwayStore store,Coordination coordination,InitialPathwayAccess access) {
        this.actors=actors;this.store=store;this.coordination=coordination;this.access=access;
    }
    public Status request(UUID id) { var scope=Scope.own(actors.require());return status(store.request(scope,id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"))); }
    public View current() {
        var scope=Scope.own(actors.require());var request=store.current(scope);
        if(request.isEmpty())return new View(null,List.of(),List.of(),false);
        if(!coordination.current(scope).filter(request.get().selection()::equals).isPresent())throw new Failure(409,"STALE_SELECTION");
        return view(scope,request.get(),false);
    }
    public View archived(UUID id) {
        var scope=Scope.own(actors.require());var request=store.request(scope,id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        if(request.review()!=Review.ARCHIVED)throw new Failure(409,"PATHWAY_NOT_ARCHIVED");return view(scope,request,true);
    }
    private View view(Scope scope,Request request,boolean archived) {
        if(request.revision()==null || !archived && request.review()!=Review.APPROVED
                || archived && !store.approved(scope,request.id(),request.revision(),request.contentHash()))
            return new View(status(request),List.of(),List.of(),archived);
        var revision=store.revision(scope,request.id(),request.revision());var modules=new ArrayList<ModuleView>();
        for(var module:revision.plan().modules()) {
            var safe=new ModuleSummary(module.id(),module.title(),module.contentVersion(),module.ordinal(),module.durationMinutes(),module.priceVnd(),
                    module.targets().stream().map(t->new Target(t.skillId(),t.instructionLevel().name())).toList());
            if(archived)modules.add(new ModuleView(safe,"ARCHIVED",null,null));
            else try { modules.add(new ModuleView(safe,"AVAILABLE",null,access.requireEntry(request.id(),module.id()))); }
            catch(Failure unavailable) {
                if(unavailable.status()!=423 && unavailable.status()!=503)throw unavailable;
                modules.add(new ModuleView(safe,unavailable.status()==423?"LOCKED":"UNAVAILABLE",unavailable.code(),null));
            }
        }
        var current=store.request(scope,request.id()).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        if(!Objects.equals(current.revision(),request.revision()) || !Objects.equals(current.contentHash(),request.contentHash()) || current.review()!=request.review())
            throw new Failure(409,"STALE_PATHWAY_VIEW");
        var dependencies=revision.plan().dependencies().stream().map(d->new DependencyView(d.moduleId(),d.providerModuleId(),d.dependentSkillId(),
                d.prerequisiteSkillId(),d.moduleId().equals(d.providerModuleId()))).toList();
        return new View(status(request),List.copyOf(modules),dependencies,archived);
    }
    private Status status(Request r) {
        var binding=r.frozen().input().binding();return new Status(r.id(),r.generation(),r.review(),r.validation(),
                InitialPathwayState.display(r.generation(),r.review(),r.validation()),r.reason(),r.revision(),r.contentHash(),binding.roleName(),binding.levelName());
    }
}
