package com.adaptlearngraph.entities.domain;

import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import java.util.*;

/** Downstream eligibility never alters a frozen paper or carries a score into a retake. */
public final class RuleAssessmentDecision {
    private RuleAssessmentDecision() {}
    public enum State { BASELINE_RECORDED, MAIN_FAILED, VETO_RETAKE_REQUIRED, WAITING_SUPPLEMENT, READY }
    public record Decision(State state,GroupResult main,List<GroupResult> reviews,List<GroupResult> supplements) {
        public Decision { reviews=List.copyOf(reviews);supplements=List.copyOf(supplements); }
    }
    public static Decision decide(Purpose purpose,List<GroupResult> results,Set<String> officialAtFinalization,Set<String> officialNow,boolean assignedLearningPending) {
        if(results.isEmpty() || results.stream().map(GroupResult::groupId).distinct().count()!=results.size()
                || results.stream().map(r->r.requirement().key()).distinct().count()!=results.size())
            throw new IllegalArgumentException("Complete unique group results required");
        if(purpose==Purpose.BASELINE) {
            if(results.stream().anyMatch(r->r.role()!=GroupRole.TARGET))throw new IllegalArgumentException("Baseline contains a non-target group");
            return new Decision(State.BASELINE_RECORDED,null,List.of(),List.of());
        }
        var main=results.stream().filter(r->r.role()==GroupRole.MAIN).toList();
        if(main.size()!=1 || results.stream().anyMatch(r->r.role()==GroupRole.TARGET))throw new IllegalArgumentException("One main group required");
        var reviews=new ArrayList<GroupResult>();var supplements=new ArrayList<GroupResult>();
        for(var result:results)if(result.role()==GroupRole.PREREQUISITE && !result.passed()) {
            if(officialAtFinalization.contains(result.requirement().key()))reviews.add(result);
            if(!officialNow.contains(result.requirement().key()))supplements.add(result);
        }
        State state=!main.getFirst().passed()?State.MAIN_FAILED:
                results.stream().anyMatch(GroupResult::vetoTriggered)?State.VETO_RETAKE_REQUIRED:
                !supplements.isEmpty() || assignedLearningPending?State.WAITING_SUPPLEMENT:State.READY;
        return new Decision(state,main.getFirst(),reviews,supplements);
    }
}
