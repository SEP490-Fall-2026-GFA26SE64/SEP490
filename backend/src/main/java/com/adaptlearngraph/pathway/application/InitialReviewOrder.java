package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.InitialPathwayStore.Revision;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Module;
import java.util.*;

/** Expert presentation order only; generation/provider selection remains owned by the planner. */
public final class InitialReviewOrder {
    private InitialReviewOrder() {}
    public static final class Rejected extends RuntimeException {
        private final List<String> diagnostics;
        Rejected(List<String> diagnostics) { super("PREREQUISITE_ORDER_VIOLATION"); this.diagnostics=List.copyOf(diagnostics); }
        public List<String> diagnostics() { return diagnostics; }
    }
    static boolean explicit(Revision previous) {
        return previous.overrides().stream().anyMatch(o->o.getFirst().startsWith("MOVE_"));
    }
    static List<String> ids(Plan plan) { return plan.modules().stream().sorted(Comparator.comparingInt(Module::ordinal)).map(Module::id).toList(); }
    static Plan retain(Plan fresh,Revision previous,boolean membershipChanged) {
        if(!explicit(previous))return fresh;
        return apply(fresh,ids(previous.plan()),membershipChanged);
    }
    static Plan move(Plan fresh,Revision previous,String moduleId,boolean up) {
        var order=new ArrayList<>(ids(previous.plan()));
        int index=order.indexOf(moduleId), target=index+(up?-1:1);
        if(index<0)throw new InitialPathwayPorts.Failure(422,"MODULE_NOT_IN_DRAFT");
        if(target<0 || target>=order.size())throw new InitialPathwayPorts.Failure(422,"MOVE_OUT_OF_RANGE");
        Collections.swap(order,index,target);
        var moved=apply(fresh,order,false);
        var violations=moved.diagnostics().stream().filter(d->d.startsWith("PREREQUISITE_ORDER:")).toList();
        if(!violations.isEmpty())throw new Rejected(violations);
        // A missing/changed member cannot silently turn an adjacent move into a different reorder.
        if(!ids(moved).equals(order))throw new InitialPathwayPorts.Failure(409,"VALIDATION_CHANGED");
        return moved;
    }
    private static Plan apply(Plan plan,List<String> preference,boolean repairOrder) {
        var byId=new LinkedHashMap<String,Module>();plan.modules().forEach(m->byId.put(m.id(),m));
        var order=new ArrayList<>(preference.stream().filter(byId::containsKey).toList());
        for(String id:byId.keySet())if(!order.contains(id))order.add(id);
        if(repairOrder) {
            // Stable topological placement: retain existing relative order whenever dependencies allow it.
            // A newly added prerequisite inherits the earliest dependent's priority, so it is
            // inserted before that dependent instead of pushing it behind unrelated old modules.
            var priority=new HashMap<String,Integer>();for(int i=0;i<order.size();i++)priority.put(order.get(i),i);
            for(int pass=0;pass<order.size();pass++)for(var d:plan.dependencies())
                if(d.providerModuleId()!=null && priority.containsKey(d.providerModuleId()) && priority.containsKey(d.moduleId()))
                    priority.merge(d.providerModuleId(),priority.get(d.moduleId()),Math::min);
            var remaining=new LinkedHashSet<>(order);var sorted=new ArrayList<String>();
            while(!remaining.isEmpty()) {
                String next=order.stream().sorted(Comparator.comparingInt(priority::get)).filter(remaining::contains).filter(id->plan.dependencies().stream()
                        .filter(d->id.equals(d.moduleId()) && d.providerModuleId()!=null && !id.equals(d.providerModuleId()))
                        .noneMatch(d->remaining.contains(d.providerModuleId()))).findFirst().orElse(null);
                if(next==null)break;
                sorted.add(next);remaining.remove(next);
            }
            sorted.addAll(remaining);order=sorted;
        }
        var positions=new HashMap<String,Integer>();for(int i=0;i<order.size();i++)positions.put(order.get(i),i);
        var errors=new TreeSet<>(plan.diagnostics());
        for(var dependency:plan.dependencies()) {
            String provider=dependency.providerModuleId(), dependent=dependency.moduleId();
            if(provider!=null && !provider.equals(dependent) && positions.containsKey(provider) && positions.containsKey(dependent)
                    && positions.get(provider)>=positions.get(dependent))
                errors.add("PREREQUISITE_ORDER:"+provider+":"+dependent+":"+dependency.prerequisiteSkillId());
        }
        var modules=new ArrayList<Module>();
        for(String id:order) {var m=byId.get(id);modules.add(new Module(m.id(),m.title(),m.contentVersion(),m.durationMinutes(),m.priceVnd(),modules.size()+1,m.targets()));}
        return new Plan(modules,plan.dependencies(),List.copyOf(errors),plan.sourcePins(),plan.formatVersion(),
                plan.warnings(),plan.quality(),plan.search(),plan.needs());
    }
}
