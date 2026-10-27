package com.adaptlearngraph.recommendation.domain;

import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.util.*;

/** initial-ranked-feasible-v1. Iterative bounded search, no independent-top1 truncation. */
public final class InitialPathwayPlanner {
    private final InitialPlanValidator validator=new InitialPlanValidator();
    public Plan generate(Problem problem,long maxStates) { return search(problem,maxStates,null); }
    public Plan review(Problem problem,Set<String> selected,long maxStates) { return search(problem,maxStates,Set.copyOf(selected)); }
    private Plan search(Problem p,long maxStates,Set<String> fixed) {
        if(maxStates<1) throw new IllegalArgumentException("Search budget required");
        var arcs=new TreeMap<String,Set<String>>(); var needs=new TreeMap<String,Need>();
        for(var need:p.needs()) { if(needs.put(need.skillId(),need)!=null) return failure(p,"DUPLICATE_NEED"); arcs.put(need.skillId(),new TreeSet<>()); }
        for(var edge:p.edges()) { arcs.computeIfAbsent(edge.prerequisiteSkillId(),k->new TreeSet<>()).add(edge.dependentSkillId()); arcs.computeIfAbsent(edge.dependentSkillId(),k->new TreeSet<>()); }
        var topo=InitialPlanValidator.topological(arcs);
        if(topo.size()!=arcs.size()) return failure(p,"SKILL_DEPENDENCY_CYCLE");
        var order=topo.stream().filter(needs::containsKey).toList();
        var alternatives=new ArrayList<List<Offer>>(); var seen=new HashSet<List<String>>();
        for(var offer:p.offers()) if(!seen.add(List.of(offer.moduleId(),offer.skillId()))) return failure(p,"DUPLICATE_PROVIDER_PAIR");
        for(String skill:order) {
            var candidates=p.offers().stream().filter(o->o.skillId().equals(skill)
                    && (!needs.get(skill).foundational() || o.foundationalSuitable()) && (fixed==null || fixed.contains(o.moduleId())))
                    .sorted(InitialPlanning.RANK).toList();
            if(candidates.isEmpty()) {
                if(fixed!=null) return validator.validate(p,partialAssignments(p,fixed),fixed);
                return failure(p,"MISSING_PROVIDER:"+skill);
            }
            alternatives.add(candidates);
        }
        if(order.isEmpty()) return validator.validate(p,Map.of(),fixed==null?Set.of():fixed);
        int[] choice=new int[order.size()]; Arrays.fill(choice,-1); int depth=0; long states=0; Plan firstInvalid=null;
        while(depth>=0) {
            if(++states>maxStates) {
                if(fixed!=null) {
                    var draft=firstInvalid==null?validator.validate(p,partialAssignments(p,fixed),fixed):firstInvalid;
                    var reasons=new ArrayList<>(draft.diagnostics()); reasons.add("SEARCH_LIMIT");
                    return new Plan(draft.modules(),draft.dependencies(),reasons,draft.sourcePins());
                }
                return failure(p,"SEARCH_LIMIT");
            }
            if(++choice[depth]>=alternatives.get(depth).size()) { choice[depth]=-1; depth--; continue; }
            if(depth+1<order.size()) { depth++; continue; }
            var assignment=new TreeMap<String,Offer>(); var selected=new TreeSet<String>();
            for(int i=0;i<order.size();i++) { var offer=alternatives.get(i).get(choice[i]); assignment.put(order.get(i),offer); selected.add(offer.moduleId()); }
            var plan=validator.validate(p,assignment,fixed==null?selected:fixed);
            if(plan.valid()) return plan;
            if(firstInvalid==null) firstInvalid=plan;
        }
        return fixed==null?failure(p,"NO_FEASIBLE_PROVIDER_COMBINATION"):Objects.requireNonNull(firstInvalid);
    }
    private Map<String,Offer> partialAssignments(Problem p,Set<String> selected) {
        var found=new TreeMap<String,Offer>();
        for(var need:p.needs()) p.offers().stream().filter(o->selected.contains(o.moduleId()) && o.skillId().equals(need.skillId())
                && (!need.foundational() || o.foundationalSuitable())).min(InitialPlanning.RANK).ifPresent(o->found.put(need.skillId(),o));
        return found;
    }
    private Plan failure(Problem p,String reason) { return new Plan(List.of(),List.of(),List.of(reason),p.sourcePins()); }
}
