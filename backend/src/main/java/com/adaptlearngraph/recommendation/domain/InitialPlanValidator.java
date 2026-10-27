package com.adaptlearngraph.recommendation.domain;

import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Module;
import java.util.*;

/** Shared generator/review validation. Missing providers/gates/cycles remain explicit diagnostics. */
public final class InitialPlanValidator {
    public Plan validate(Problem problem,Map<String,Offer> assignments,Set<String> selectedModules) {
        var errors=new TreeSet<String>(); var needed=new TreeMap<String,Need>();
        for(var need:problem.needs()) if(needed.put(need.skillId(),need)!=null) errors.add("DUPLICATE_NEED:"+need.skillId());
        for(var need:needed.values()) {
            var offer=assignments.get(need.skillId());
            if(offer==null || !selectedModules.contains(offer.moduleId())) errors.add("MISSING_PROVIDER:"+need.skillId());
            else if(!problem.offers().contains(offer) || !offer.skillId().equals(need.skillId())
                    || need.foundational() && !offer.foundationalSuitable()) errors.add("UNSUITABLE_PROVIDER:"+need.skillId());
        }
        var byModule=new TreeMap<String,List<Offer>>();
        for(String id:new TreeSet<>(selectedModules)) {
            var assigned=assignments.values().stream().filter(o->id.equals(o.moduleId())).sorted(Comparator.comparing(Offer::skillId)).toList();
            var targets=assigned.isEmpty()?problem.offers().stream().filter(o->id.equals(o.moduleId()) && needed.containsKey(o.skillId())
                    && (!needed.get(o.skillId()).foundational() || o.foundationalSuitable())).sorted(Comparator.comparing(Offer::skillId)).toList()
                    :assigned;
            if(targets.isEmpty()) errors.add("UNMATCHED_MODULE:"+id); else byModule.put(id,targets);
        }
        var dependencies=new ArrayList<Dependency>(); var arcs=new TreeMap<String,Set<String>>();
        byModule.keySet().forEach(id->arcs.put(id,new TreeSet<>()));
        for(var edge:problem.edges()) {
            for(var target:byModule.values().stream().flatMap(List::stream).filter(o->o.skillId().equals(edge.dependentSkillId())).toList()) {
            var provider=assignments.get(edge.prerequisiteSkillId());
            if(provider==null && !problem.externallyReadySkills().contains(edge.prerequisiteSkillId())) {
                errors.add("UNPLANNED_PREREQUISITE:"+edge.prerequisiteSkillId()); continue;
            }
            var gates=problem.gates().stream().filter(g->g.moduleId().equals(target.moduleId())
                    && g.dependentSkillId().equals(edge.dependentSkillId()) && g.prerequisiteSkillId().equals(edge.prerequisiteSkillId())).toList();
            if(gates.size()!=1) { errors.add("READINESS_MAPPING_MISSING_OR_AMBIGUOUS:"+target.moduleId()+":"+edge.prerequisiteSkillId()); continue; }
            var gate=gates.getFirst(); String providerId=provider==null?null:provider.moduleId();
            if(target.moduleId().equals(providerId)) {
                if(gate.internalGateId()==null || gate.internalGateId().isBlank()) errors.add("INTERNAL_GATE_MISSING:"+providerId);
            } else if(providerId!=null) {
                if(!arcs.containsKey(providerId)) errors.add("MISSING_PROVIDER:"+edge.prerequisiteSkillId());
                else arcs.get(providerId).add(target.moduleId());
            }
            dependencies.add(new Dependency(target.moduleId(),edge.dependentSkillId(),edge.prerequisiteSkillId(),providerId,
                    gate.definitionId(),gate.version(),gate.internalGateId()));
            }
        }
        var order=topological(arcs); if(order.size()!=arcs.size()) errors.add("MODULE_DEPENDENCY_CYCLE");
        var modules=new ArrayList<Module>(); int ordinal=0;
        // Invalid drafts retain every selected module for repair; they cannot become approvable partial plans.
        var retained=new ArrayList<>(order); new TreeSet<>(byModule.keySet()).stream().filter(id->!retained.contains(id)).forEach(retained::add);
        for(String id:retained) {
            var targets=byModule.get(id); var first=targets.getFirst();
            if(targets.stream().anyMatch(o->!o.contentVersion().equals(first.contentVersion())
                    || o.durationMinutes().compareTo(first.durationMinutes())!=0 || o.priceVnd().compareTo(first.priceVnd())!=0)) errors.add("INCOHERENT_MODULE:"+id);
            modules.add(new Module(id,first.title(),first.contentVersion(),first.durationMinutes(),first.priceVnd(),++ordinal,targets));
        }
        return new Plan(modules,dependencies,List.copyOf(errors),problem.sourcePins());
    }
    public static List<String> topological(Map<String,? extends Set<String>> arcs) {
        var incoming=new TreeMap<String,Integer>(); arcs.keySet().forEach(k->incoming.put(k,0));
        arcs.values().forEach(next->next.forEach(id->{ if(!incoming.containsKey(id)) throw new IllegalArgumentException("Unknown dependency node"); incoming.merge(id,1,Integer::sum); }));
        var ready=new PriorityQueue<String>(); incoming.forEach((k,v)->{if(v==0)ready.add(k);}); var order=new ArrayList<String>();
        while(!ready.isEmpty()) { String id=ready.remove(); order.add(id); for(String next:arcs.get(id)) if(incoming.merge(next,-1,Integer::sum)==0)ready.add(next); }
        return List.copyOf(order);
    }
}
