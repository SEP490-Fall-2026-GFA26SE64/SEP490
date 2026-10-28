package com.adaptlearngraph.recommendation.domain;

import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.util.*;

/** Prove Primary availability, then bounded branch-and-bound over legal complete paths. */
public final class InitialPathwayPlanner {
    public static final String VERSION="initial-whole-path-v2";
    private final InitialPlanValidator validator=new InitialPlanValidator();
    public Plan generate(Problem problem,long maxStates){return search(problem,maxStates,null);}
    public Plan review(Problem problem,Set<String> selected,long maxStates){return search(problem,maxStates,Set.copyOf(selected));}
    private Plan search(Problem p,long maximum,Set<String> fixed) {
        if(maximum<1)throw new IllegalArgumentException("Search budget required");
        var needs=new TreeMap<String,Need>();var arcs=new TreeMap<String,Set<String>>();
        for(var n:p.needs()) {if(needs.put(n.skillId(),n)!=null)return failure(p,"DUPLICATE_NEED",fixed,0);arcs.put(n.skillId(),new TreeSet<>());}
        for(var edge:p.edges()) { arcs.computeIfAbsent(edge.prerequisiteSkillId(),k->new TreeSet<>()).add(edge.dependentSkillId()); arcs.computeIfAbsent(edge.dependentSkillId(),k->new TreeSet<>()); }
        var topo=InitialPlanValidator.topological(arcs);
        if(topo.size()!=arcs.size())return failure(p,"SKILL_DEPENDENCY_CYCLE",fixed,0);
        var pairs=new HashSet<List<String>>();
        for(var offer:p.offers())if(!pairs.add(List.of(offer.moduleId(),offer.skillId())))return failure(p,"DUPLICATE_PROVIDER_PAIR",fixed,0);
        var metadata=new HashMap<String,Offer>();
        for(var offer:p.offers()) {
            var prior=metadata.putIfAbsent(offer.moduleId(),offer);
            if(prior!=null && (!prior.contentVersion().equals(offer.contentVersion()) || !prior.title().equals(offer.title())
                    || prior.durationMinutes().compareTo(offer.durationMinutes())!=0 || prior.priceVnd().compareTo(offer.priceVnd())!=0))
                return failure(p,"INCOHERENT_MODULE:"+offer.moduleId(),fixed,0);
        }
        var order=topo.stream().filter(needs::containsKey).toList();var all=new ArrayList<List<Offer>>();
        for(String skill:order) {
            var candidates=p.offers().stream().filter(o->skill.equals(o.skillId()) && o.canCover())
                    .sorted(Comparator.comparing((Offer o)->o.teachingFocus()!=TeachingFocus.PRIMARY).thenComparing(InitialPlanning.RANK)).toList();
            if(candidates.isEmpty())return failure(p,"MISSING_PROVIDER:"+skill,fixed,0);all.add(candidates);
        }
        if(order.isEmpty())return validator.validate(p,Map.of(),fixed==null?Set.of():fixed)
                .searched(new Search(scope(fixed),true,fixed==null?"PROVEN":"NOT_APPLICABLE",0));
        var budget=new Budget(maximum);var primary=new TreeSet<String>();boolean[] feasible={false};
        // Search the source universe, not the Expert subset. Exclusion cannot fabricate Primary absence.
        boolean proved=enumerate(p,order,all,null,budget,null,(assignment,plan)->{
            feasible[0]=true;
            assignment.forEach((skill,offer)->{if(offer.teachingFocus()==TeachingFocus.PRIMARY)primary.add(skill);});
            return primary.size()<order.size();
        });
        if(!proved)return failure(p,"SEARCH_LIMIT",fixed,budget.visited);
        if(!feasible[0])return failure(p,"NO_FEASIBLE_PROVIDER_COMBINATION",fixed,budget.visited);
        var legal=new ArrayList<List<Offer>>();
        for(int i=0;i<order.size();i++) {
            String skill=order.get(i);var candidates=all.get(i).stream().filter(o->o.teachingFocus()==(primary.contains(skill)?TeachingFocus.PRIMARY:TeachingFocus.SUPPORTING)
                    && (fixed==null || fixed.contains(o.moduleId()))).toList();
            if(candidates.isEmpty())return failure(p,"MISSING_PROVIDER:"+skill,fixed,budget.visited,primary);legal.add(candidates);
        }
        Plan[] best={null};
        boolean complete=enumerate(p,order,legal,fixed,budget,best,(assignment,plan)->{
            if(best[0]==null || InitialPlanObjective.compare(plan,best[0])<0)best[0]=plan;return true;
        });
        if(!complete)return failure(p,"SEARCH_LIMIT",fixed,budget.visited,primary);
        return best[0]==null?failure(p,"NO_FEASIBLE_PROVIDER_COMBINATION",fixed,budget.visited,primary):
                best[0].searched(new Search(scope(fixed),true,fixed==null?"PROVEN":"NOT_APPLICABLE",budget.visited));
    }
    private interface Visitor { boolean accept(Map<String,Offer> assignment,Plan plan); }
    /** false means budget exhaustion; early visitor completion supplies constructive proof. */
    private boolean enumerate(Problem p,List<String> skills,List<List<Offer>> alternatives,Set<String> fixed,Budget budget,Plan[] incumbent,Visitor visitor) {
        int[] choice=new int[skills.size()];Arrays.fill(choice,-1);int depth=0;
        while(depth>=0) {
            if(!budget.take())return false;
            if(++choice[depth]>=alternatives.get(depth).size()) { choice[depth]=-1; depth--; continue; }
            if(incumbent!=null && incumbent[0]!=null && dominated(p,alternatives,choice,depth,fixed,incumbent[0]))continue;
            if(depth+1<skills.size()) { depth++; continue; }
            var assignment=new TreeMap<String,Offer>();var selected=new TreeSet<String>();
            for(int i=0;i<skills.size();i++){var offer=alternatives.get(i).get(choice[i]);assignment.put(skills.get(i),offer);selected.add(offer.moduleId());}
            var plan=validator.validate(p,assignment,fixed==null?selected:fixed);
            if(plan.valid() && !visitor.accept(assignment,plan))return true;
        }
        return true;
    }
    /** Partial quality counts and distinct nonnegative costs are admissible lower bounds. */
    private boolean dominated(Problem p,List<List<Offer>> alternatives,int[] choices,int depth,Set<String> fixed,Plan best) {
        int supporting=0,second=0,first=0;var modules=new TreeSet<String>();
        for(int i=0;i<=depth;i++) {
            var offer=alternatives.get(i).get(choices[i]);modules.add(offer.moduleId());
            if(offer.teachingFocus()==TeachingFocus.SUPPORTING)supporting++;
            if(offer.preference()==2)second++;else if(offer.preference()==1)first++;
        }
        var q=best.quality();int value=Integer.compare(supporting,q.supportingFallbacks());
        if(value==0)value=Integer.compare(second,q.secondFallbacks());
        if(value==0)value=Integer.compare(first,q.firstFallbacks());
        if(value!=0)return value>0;
        if(fixed!=null)modules.addAll(fixed);
        var duration=java.math.BigDecimal.ZERO;var price=java.math.BigDecimal.ZERO;
        for(String id:modules) {
            var offer=p.offers().stream().filter(o->id.equals(o.moduleId())).findFirst().orElse(null);
            if(offer==null)return false;duration=duration.add(offer.durationMinutes());price=price.add(offer.priceVnd());
        }
        value=duration.compareTo(q.durationMinutes());
        return value>0 || value==0 && price.compareTo(q.priceVnd())>0;
    }
    private Plan failure(Problem p,String reason,Set<String> fixed,long visited) {
        return failure(p,reason,fixed,visited,null);
    }
    private Plan failure(Problem p,String reason,Set<String> fixed,long visited,Set<String> primary) {
        var assignment=new TreeMap<String,Offer>();
        if(fixed!=null)for(var need:p.needs())p.offers().stream().filter(o->fixed.contains(o.moduleId()) && o.skillId().equals(need.skillId()) && o.canCover())
                .filter(o->o.teachingFocus()==(primary==null || primary.contains(need.skillId())?TeachingFocus.PRIMARY:TeachingFocus.SUPPORTING))
                .min(InitialPlanning.RANK).ifPresent(o->assignment.put(need.skillId(),o));
        var draft=validator.validate(p,assignment,fixed==null?Set.of():fixed);var errors=new LinkedHashSet<String>();errors.add(reason);
        if(fixed!=null && !reason.equals("SEARCH_LIMIT"))errors.addAll(draft.diagnostics());
        return new Plan(draft.modules(),draft.dependencies(),List.copyOf(errors),p.sourcePins(),2,draft.warnings(),draft.quality(),
                new Search(scope(fixed),!reason.equals("SEARCH_LIMIT"),fixed==null?"NOT_PROVEN":"NOT_APPLICABLE",visited),p.needs());
    }
    private static String scope(Set<String> fixed){return fixed==null?"GENERATION":"FIXED_SET";}
    private static final class Budget {
        final long maximum;long visited;Budget(long maximum){this.maximum=maximum;}
        boolean take(){if(visited>=maximum)return false;visited++;return true;}
    }
}
