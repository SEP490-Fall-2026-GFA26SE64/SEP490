package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RequirementPathway;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Called in the persisted outcome job's learner transaction. Actual failed groups are the sole supplement input. */
public final class RequirementPathwayRecalculationService {
    private final RequirementPathwayJpaRepository rules;private final RequirementPathwayRevisions revisions;
    private final RequirementPathwayPlanningService planning;private final RequirementPathwayReviewService review;private final ObjectMapper json;
    public RequirementPathwayRecalculationService(RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            RequirementPathwayPlanningService planning,RequirementPathwayReviewService review,ObjectMapper json) {
        this.rules=rules;this.revisions=revisions;this.planning=planning;this.review=review;this.json=json;
    }
    public void assessed(RuleAssessmentAttemptEntity attempt,UUID event,List<RuleAssessmentOutcomeJpaRepository.GroupRow> groups) {
        InitialJpa.requireTransaction();if(!"SKILL_ASSESSMENT".equals(attempt.getPurpose()))return;
        try {
            var context=json.readTree(attempt.getContextSnapshot()).path("context");UUID request=UUID.fromString(context.path("requestId").asText());
            var row=rules.lock(attempt.getOrganizationId(),request).orElseThrow(()->new Failure(503,"ASSESSED_PATHWAY_NOT_FOUND"));
            if(!row.getLearnerId().equals(attempt.getLearnerId()))throw new Failure(503,"ASSESSED_PATHWAY_SCOPE_INVALID");
            if(row.getArchivedAt()!=null || rules.sourceApplied(row.getOrganizationId(),row.getLearnerId(),request,event))return;
            var original=revisions.read(row);var parent=original.steps().stream().filter(step->step.id().toString().equals(context.path("stepId").asText()))
                    .findFirst().orElseThrow(()->new Failure(503,"ASSESSED_REQUIREMENT_NOT_FOUND"));
            if(!parent.kind().name().equals(context.path("stepKind").asText()) || !Objects.toString(parent.sourceBypassId(),"").equals(context.path("sourceBypassId").asText("")))
                throw new Failure(503,"ASSESSED_REQUIREMENT_SCOPE_INVALID");
            var steps=new ArrayList<>(original.steps().stream().map(step->step.id().equals(parent.id()) && step.state()==State.NEEDS_SUPPLEMENTATION?
                    new Step(step.id(),step.requirement(),step.kind(),step.sourceBypassId(),State.IN_PROGRESS,"MODULE_COMPLETED_ASSESSMENT_RECORDED",null,step.options(),step.certificate(),step.assessedSources()):step).toList());
            var dependencies=new ArrayList<>(original.dependencies());
            for(var group:groups) {
                if(!"PREREQUISITE".equals(group.getRole()) || group.getPassed() || group.getOfficialAtFinalization())continue;
                var definition=java.util.stream.StreamSupport.stream(context.path("requirements").spliterator(),false)
                        .filter(item->group.getSkillId().equals(item.path("requirement").path("skillId").asText())
                            && group.getKnowledgeLevel().equals(item.path("requirement").path("knowledgeLevel").asText())).findFirst().orElseThrow();
                var outcomes=List.<String>of();
                var required=new Requirement(group.getSkillId(),definition.path("skillName").asText(),KnowledgeLevel.valueOf(group.getKnowledgeLevel()),
                        definition.path("skillVersion").asText(),outcomes,Provision.valueOf(definition.path("mode").asText()));
                var existing=steps.stream().filter(step->step.kind()==parent.kind() && Objects.equals(step.sourceBypassId(),parent.sourceBypassId())
                        && step.requirement().key().equals(required.key())).findFirst();
                if(existing.isPresent() && !existing.get().requirement().proofKey().equals(required.proofKey()))throw new Failure(422,"SUPPLEMENT_SCOPE_CONFLICT");
                var id=existing.map(Step::id).orElseGet(()->RequirementPathway.stepId(request,required,parent.kind(),parent.sourceBypassId()));
                if(id.equals(parent.id()))throw new Failure(422,"SUPPLEMENT_DEPENDENCY_CYCLE");
                var sources=new ArrayList<>(existing.map(Step::assessedSources).orElse(List.of()));
                var source=new AssessedSource(attempt.getId(),group.getGroupId(),parent.id());if(!sources.contains(source))sources.add(source);
                var next=existing.isPresent()?new Step(id,required,parent.kind(),parent.sourceBypassId(),existing.get().state(),existing.get().reason(),
                        existing.get().fulfilledEvidenceId(),existing.get().options(),existing.get().certificate(),sources):
                        new Step(id,required,parent.kind(),parent.sourceBypassId(),State.NEEDS_EXPERT_ACTION,"ASSESSED_PREREQUISITE_REQUIRES_LEARNING",null,List.of(),null,sources);
                if(existing.isPresent())steps.set(steps.indexOf(existing.get()),next);else steps.add(next);
                if(parent.kind()==Kind.REQUIRED && dependencies.stream().noneMatch(edge->edge.prerequisiteStepId().equals(id) && edge.dependentStepId().equals(parent.id())))
                    dependencies.add(new Dependency(id,parent.id(),attempt.getId(),group.getGroupId()));
            }
            // Retake passing B never removes a step or dependency discovered by an earlier actual failure.
            var next=planning.refresh(row,new Plan(steps,dependencies));
            if(!next.equals(original)) {
                var status=review.nextReview(row);
                revisions.publish(row,next,row.getRunId(),"ASSESSMENT",event,status.basis(),status.status(),null);
            }
        }catch(com.adaptlearngraph.exception.InitialPathwayFailure failure){throw failure;}
        catch(Exception invalid){throw new Failure(503,"ASSESSMENT_PATHWAY_RECALCULATION_FAILED");}
    }
    public Optional<RuleAssessmentOutcomeService.PathwayBefore> before(RuleAssessmentAttemptEntity attempt) {
        InitialJpa.requireTransaction();if(!"SKILL_ASSESSMENT".equals(attempt.getPurpose()))return Optional.empty();
        try {
            UUID id=UUID.fromString(json.readTree(attempt.getContextSnapshot()).path("context").path("requestId").asText());
            var row=rules.lock(attempt.getOrganizationId(),id).orElseThrow(()->new Failure(503,"ASSESSED_PATHWAY_NOT_FOUND"));
            if(!row.getLearnerId().equals(attempt.getLearnerId()))throw new Failure(503,"ASSESSED_PATHWAY_SCOPE_INVALID");
            return row.getArchivedAt()!=null?Optional.empty():Optional.of(new RuleAssessmentOutcomeService.PathwayBefore(id,revisions.read(row)));
        }catch(java.io.IOException invalid){throw new Failure(503,"ASSESSMENT_PATHWAY_RECALCULATION_FAILED");}
    }
    public void notify(RuleAssessmentAttemptEntity attempt,UUID event,Optional<RuleAssessmentOutcomeService.PathwayBefore> before) {
        if(before.isEmpty())return;
        var saved=before.get();var row=rules.own(attempt.getOrganizationId(),attempt.getLearnerId(),saved.requestId()).orElseThrow();
        revisions.recalculated(row,row.getCurrentRevision(),saved.plan(),revisions.read(row),event);
    }
}
