package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.adaptlearngraph.services.RuleAssessmentAttemptService;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.entities.domain.RuleAssessment.Policy;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.data.domain.PageRequest;

/** Read-only next-step projection over exact selected Role/Level rule attempts, never numeric mastery. */
public final class RuleBaselineProgress implements Baseline {
    private final CurrentRoleSelectionStore selections;
    private final RuleAssessmentAttemptService.Contexts contexts;
    private final RuleAssessmentAttemptJpaRepository attempts;
    private final ScopedAssessmentPolicyJpaRepository policies;
    private final RuleAssessmentOutcomeJpaRepository groups;
    private final ObjectMapper json;
    public RuleBaselineProgress(CurrentRoleSelectionStore selections,RuleAssessmentAttemptService.Contexts contexts,
            RuleAssessmentAttemptJpaRepository attempts,ScopedAssessmentPolicyJpaRepository policies,RuleAssessmentOutcomeJpaRepository groups,ObjectMapper json) {
        this.selections=selections;this.contexts=contexts;this.attempts=attempts;this.policies=policies;this.groups=groups;this.json=json;
    }
    @Override public List<MasteryProfile> mastery(Actor actor){throw new Failure(409,"NUMERIC_PROFILE_RETIRED");}
    @Override public Optional<Progress> active(Actor actor) {
        return attempts.activeBaseline(actor.organizationId(),actor.learnerId(),PageRequest.of(0,1)).stream().findFirst()
                .map(a->new Progress("RESUME",0,0,a.getId(),null));
    }
    @Override public Progress progress(Actor actor,Role role,Set<String> ignoredSkillOnlyUnion) {
        var selection=selections.current(actor).orElseThrow(()->new Failure(409,"SELECTION_REQUIRED"));
        RuleAssessmentAttemptService.Context context;
        try {context=contexts.resolve(actor,new RuleAssessmentAttemptService.Start(Purpose.BASELINE,selection.selectionId(),selection.revision(),null,null,null,null));}
        catch(com.adaptlearngraph.services.AssessmentPolicyService.Failure failure) {
            if(failure.status==422)return new Progress("BASELINE_UNAVAILABLE",0,0,null,null);
            throw new Failure(failure.status,failure.code);
        }
        var history=attempts.contextHistory(actor.organizationId(),actor.learnerId(),Purpose.BASELINE.name(),context.contextKey(),PageRequest.of(0,1));
        UUID previous=null;int covered=0;
        if(!history.isEmpty()) {
            var attempt=history.getFirst();
            if("IN_PROGRESS".equals(attempt.getState()))return new Progress("RESUME",context.groups().size(),0,attempt.getId(),null);
            var results=groups.groups(actor.organizationId(),actor.learnerId(),attempt.getId());
            int count;
            try {count=json.readTree(attempt.getContextSnapshot()).path("groupCount").asInt(-1);}
            catch(java.io.IOException invalid){throw new Failure(503,"ASSESSMENT_INTEGRITY_FAILURE");}
            if(count<1 || results.size()!=count)throw new Failure(503,"ASSESSMENT_INTEGRITY_FAILURE");
            try {
                var pinned=definitions(json.readTree(attempt.getContextSnapshot()).path("context"));
                var current=definitions(json.readTree(context.snapshot()));
                for(var need:context.groups()) {
                    var old=pinned.get(need.requirement().key());var expected=current.get(need.requirement().key());
                    if(old==null || expected==null || !old.path("skillVersion").asText().equals(expected.path("skillVersion").asText()))continue;
                    if(results.stream().anyMatch(result->result.getSkillId().equals(need.requirement().skillId())
                            && result.getKnowledgeLevel().equals(need.requirement().knowledgeLevel().name()) && result.getRole().equals("TARGET")
                            && json.convertValue(old.path("requirement"),com.adaptlearngraph.entities.domain.RuleAssessment.Requirement.class).equals(need.requirement())))covered++;
                }
            }catch(java.io.IOException invalid){throw new Failure(503,"ASSESSMENT_INTEGRITY_FAILURE");}
            if(!context.groups().isEmpty() && covered==context.groups().size())return new Progress("COMPLETE",covered,covered,attempt.getId(),null);
            previous=attempt.getId();
        }
        if(context.groups().isEmpty())return new Progress("BASELINE_NOT_REQUIRED",0,0,null,null);
        var policy=policies.active(actor.organizationId(),Purpose.BASELINE.name(),
                com.adaptlearngraph.entities.domain.AssessmentPolicyScope.key(Purpose.BASELINE,role.id(),selection.levelId()));
        if(policy.isEmpty())return new Progress("BASELINE_UNAVAILABLE",context.groups().size(),0,null,null);
        try {
            var configuration=json.readValue(policy.get().getConfiguration(),Policy.class);
            for(var group:context.groups())configuration.require(group.requirement());
        }catch(java.io.IOException|IllegalArgumentException missing){return new Progress("BASELINE_UNAVAILABLE",context.groups().size(),0,null,null);}
        return new Progress("BASELINE_REQUIRED",context.groups().size(),covered,previous,null);
    }
    private Map<String,com.fasterxml.jackson.databind.JsonNode> definitions(com.fasterxml.jackson.databind.JsonNode context) {
        var result=new HashMap<String,com.fasterxml.jackson.databind.JsonNode>();
        for(var definition:context.path("requirements")) {
            var requirement=json.convertValue(definition.path("requirement"),com.adaptlearngraph.entities.domain.RuleAssessment.Requirement.class);
            if(result.put(requirement.key(),definition)!=null)throw new Failure(503,"ASSESSMENT_INTEGRITY_FAILURE");
        }
        return result;
    }
}
