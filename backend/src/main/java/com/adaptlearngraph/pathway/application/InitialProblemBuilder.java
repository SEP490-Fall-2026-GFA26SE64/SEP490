package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.recommendation.domain.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.util.*;

/** Orchestrates real catalog/policy ports. No policy/readiness/eligibility fallback. */
public final class InitialProblemBuilder {
    private final Graphs graphs; private final SuitabilityPolicy suitability; private final ReadinessDefinitions readiness;
    private final Availability availability; private final java.util.function.Supplier<Limits> settings;
    public InitialProblemBuilder(Graphs graphs,SuitabilityPolicy suitability,ReadinessDefinitions readiness,Availability availability,Limits limits) {
        this(graphs,suitability,readiness,availability,()->limits);
    }
    public InitialProblemBuilder(Graphs graphs,SuitabilityPolicy suitability,ReadinessDefinitions readiness,Availability availability,java.util.function.Supplier<Limits> settings) {
        this.graphs=graphs;this.suitability=suitability;this.readiness=readiness;this.availability=availability;this.settings=settings;
    }
    public Problem build(Scope scope,Binding binding,RoleGap.Result gaps,String planningHash) {
        InitialPathwayAdmission.requirePlanningVersions(binding);
        var limits=settings.get();
        var needs=new TreeMap<String,Need>();
        gaps.skills().stream().filter(RoleGap.Row::needsLearning).forEach(r->needs.put(r.skillId(),
                new Need(r.skillId(),r.evidenceState()==RoleGap.EvidenceState.UNKNOWN,r.mastery(),r.unknownReason())));
        if(needs.isEmpty()) throw new IllegalArgumentException("No learning need; use NO_LEARNING_REQUIRED");
        var graph=graphs.load(scope,binding,needs.keySet(),limits);
        if(!graph.releaseToken().equals(binding.releaseToken()) || !graph.skillIds().containsAll(needs.keySet())) throw new Failure(503,"INCOHERENT_CATALOG");
        if(graph.skillIds().size()>limits.maxClosureNodes() || graph.edges().size()>limits.maxClosureEdges() || graph.providers().size()>limits.maxProviders()) throw new Failure(422,"CATALOG_LIMIT");
        var ready=new TreeSet<String>(); var pins=new TreeMap<>(binding.versions());
        pins.put("release",binding.releaseToken()); pins.put("planningInputHash",planningHash); pins.put("search",limits.version());
        var orderedEdges=graph.edges().stream().sorted(Comparator.comparing(Edge::dependentSkillId).thenComparing(Edge::prerequisiteSkillId)).toList();
        var edgeIds=new HashSet<List<String>>();
        for(var edge:orderedEdges) {
            if(!graph.skillIds().contains(edge.dependentSkillId()) || !graph.skillIds().contains(edge.prerequisiteSkillId()))throw new Failure(503,"INCOMPLETE_CATALOG_CLOSURE");
            if(!edgeIds.add(List.of(edge.dependentSkillId(),edge.prerequisiteSkillId())))throw new Failure(503,"DUPLICATE_PREREQUISITE_EDGE");
        }
        var frontier=new TreeSet<>(needs.keySet());var expanded=new HashSet<String>();var relevantEdges=new ArrayList<Edge>();
        while(!frontier.isEmpty()) {
            String skill=frontier.pollFirst();if(!expanded.add(skill))continue;
            for(var edge:orderedEdges) if(edge.dependentSkillId().equals(skill)) {
                relevantEdges.add(edge);var decision=readiness.prerequisite(scope,binding,edge);
                pins.put("readinessEvidence:"+InitialIdentity.hash("edge",List.of(edge.dependentSkillId(),edge.prerequisiteSkillId(),edge.requiredScore())),decision.evidenceIdentity());
                if(decision.learningRequired()) {
                    if(!needs.containsKey(edge.prerequisiteSkillId())) {
                        if(decision.mastery()==null && (decision.unknownReason()==null || decision.unknownReason().isBlank()))
                            throw new Failure(503,"READINESS_EVIDENCE_NOT_CONFIGURED",false);
                        needs.put(edge.prerequisiteSkillId(),new Need(edge.prerequisiteSkillId(),decision.mastery()==null,decision.mastery(),decision.unknownReason()));
                    }
                    frontier.add(edge.prerequisiteSkillId());
                }else ready.add(edge.prerequisiteSkillId());
            }
        }
        var offers=new ArrayList<Offer>();var gates=new ArrayList<GateDefinition>();var unavailableModules=new HashSet<String>();
        var availabilityByModule=new HashMap<List<String>,Boolean>();
        for(var provider:graph.providers()) {
            if(!availabilityByModule.computeIfAbsent(List.of(provider.moduleId(),provider.contentVersion()),
                    k->availability.available(scope,provider.moduleId(),provider.contentVersion()))) {unavailableModules.add(provider.moduleId());continue;}
            var need=needs.get(provider.skillId());
            var result=need==null || provider.teachingFocus()==TeachingFocus.INCIDENTAL?null:suitability.evaluate(scope,binding,need,provider);
            if(result!=null && !result.version().equals(binding.versions().get("suitability")))throw new Failure(503,"INCOHERENT_POLICY");
            if(result!=null && !result.eligible()){unavailableModules.add(provider.moduleId());continue;}
            var providerGates=new ArrayList<GateDefinition>();boolean mapped=true;
            for(var edge:relevantEdges) if(result!=null && edge.dependentSkillId().equals(provider.skillId())) {
                var mapping=readiness.gate(scope,binding,provider,edge);
                if(mapping.isEmpty()){mapped=false;break;}
                var gate=mapping.get();
                if(!gate.moduleId().equals(provider.moduleId()) || !gate.dependentSkillId().equals(edge.dependentSkillId())
                        || !gate.prerequisiteSkillId().equals(edge.prerequisiteSkillId()) || !gate.version().equals(binding.versions().get("readiness")))
                    throw new Failure(503,"INCOHERENT_READINESS_DEFINITION");
                providerGates.add(gate);
            }
            if(!mapped){unavailableModules.add(provider.moduleId());continue;}
            offers.add(new Offer(provider.moduleId(),provider.title(),provider.contentVersion(),provider.durationMinutes(),provider.priceVnd(),
                    provider.skillId(),null,result==null?0:result.preference(),true,binding.versions().get("suitability"),
                    result==null?"ANCILLARY_TEACHING":result.reason(),provider.teachingFocus(),provider.difficultyLevel(),
                    result==null?null:InitialSuitability.preferred(need),CoverageRole.ANCILLARY,false,null));
            gates.addAll(providerGates);
        }
        offers.removeIf(o->unavailableModules.contains(o.moduleId()));gates.removeIf(g->unavailableModules.contains(g.moduleId()));
        return new Problem(List.copyOf(needs.values()),relevantEdges,offers,gates,ready,pins);
    }
}
