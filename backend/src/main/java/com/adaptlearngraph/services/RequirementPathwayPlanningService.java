package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Refreshes provision/evidence behind the existing revision owner; never turns a diagnostic or bypass into achievement. */
public final class RequirementPathwayPlanningService {
    private final RulePathwayCatalog catalog;private final RequirementPathwayJpaRepository rules;
    private final RequirementPathwayAdmissionService admission;private final RequirementPathwayRevisions revisions;private final ObjectMapper json;
    private RuleAssessmentContextJpaRepository history;
    public RequirementPathwayPlanningService history(RuleAssessmentContextJpaRepository value){history=Objects.requireNonNull(value);return this;}
    public RequirementPathwayPlanningService(RulePathwayCatalog catalog,RequirementPathwayJpaRepository rules,RequirementPathwayAdmissionService admission,
            RequirementPathwayRevisions revisions,ObjectMapper json) {this.catalog=catalog;this.rules=rules;this.admission=admission;this.revisions=revisions;this.json=json;}
    public Plan refresh(RequirementPathwayJpaRepository.Row row,Plan plan) {
        var input=admission.decode(row).input();var scope=new RoleBaselineFlow.Actor(row.getOrganizationId(),row.getLearnerId());
        var carried=rules.carried(row.getOrganizationId(),row.getLearnerId());
        if(carried.size()>1000)throw new InitialPathwayPorts.Failure(503,"BYPASS_HISTORY_LIMIT");
        var requested=new ArrayList<>(plan.steps().stream().filter(step->step.state()!=State.FULFILLED).map(Step::requirement).toList());
        for(var gap:carried)requested.add(requirement(gap.getRequirementSnapshot()));
        var strict=new HashSet<String>();plan.steps().stream().filter(step->step.kind()==Kind.REQUIRED && step.state()!=State.FULFILLED && step.state()!=State.BYPASSED)
                .forEach(step->strict.add(step.requirement().key()));
        var fresh=catalog.retainCertificates(row.getOrganizationId(),catalog.providers(scope,input.roleSnapshot(),input.binding().levelId(),requested,strict),input.catalog(),plan);
        var byKey=new HashMap<String,Requirement>();fresh.requirements().forEach(requirement->byKey.put(requirement.key(),requirement));
        var requirements=new ArrayList<Requirement>();
        for(var step:plan.steps()) {
            var requirement=step.requirement();var current=byKey.get(requirement.key());
            // Unknown provision has no invented outcome/version. Adopt only the real published configuration once available.
            if(requirement.provision()==Provision.UNCONFIGURED && current!=null && current.provision()!=Provision.UNCONFIGURED)requirement=current;
            requirements.add(requirement);
        }
        for(var gap:carried) {
            var required=requirement(gap.getRequirementSnapshot());var current=byKey.get(required.key());
            requirements.add(required.provision()==Provision.UNCONFIGURED && current!=null?current:required);
        }
        var official=new HashMap<String,UUID>();
        rules.official(row.getOrganizationId(),row.getLearnerId(),revisions.encode(requirements)).forEach(proof->{
            try{official.put(json.readValue(proof.getRequirementSnapshot(),Requirement.class).proofKey(),proof.getEvidenceId());}
            catch(Exception invalid){throw new IllegalStateException("Official requirement snapshot is invalid");}
        });
        var excluded=new HashSet<>(rules.excludedModules(row.getOrganizationId(),row.getRequestId(),row.getCurrentRevision()));
        var steps=new ArrayList<Step>();
        for(int i=0;i<plan.steps().size();i++) {
            var previous=plan.steps().get(i);if(previous.state()==State.FULFILLED){steps.add(previous);continue;}
            var bypass=carried.stream().filter(gap->gap.getSourceRequestId().equals(row.getRequestId()) && gap.getSourceStepId().equals(previous.id())).findFirst();
            if(previous.kind()==Kind.REQUIRED && bypass.isPresent()) {
                var gap=bypass.get();
                var replacement=RequirementPathwayGenerationService.step(row.getRequestId(),requirements.get(i),Kind.REQUIRED,null,fresh,official.get(requirements.get(i).proofKey()));
                boolean active=row.getArchivedAt()==null && row.getTimingCompletedAt()==null;
                if(!active || replacement.state()==State.NEEDS_EXPERT_ACTION) {
                    steps.add(previous.state()==State.BYPASSED?previous:new Step(previous.id(),requirement(gap.getRequirementSnapshot()),Kind.REQUIRED,null,
                            State.BYPASSED,gap.getReason(),null,List.of(),null,previous.assessedSources()));
                    continue;
                }
                // Original bypass remains in immutable history. Real provision resumes this active dependency.
            }
            var requirement=requirements.get(i);
            var next=RequirementPathwayGenerationService.step(row.getRequestId(),requirement,previous.kind(),previous.sourceBypassId(),fresh,official.get(requirement.proofKey()));
            // Once a failed prerequisite has assigned learning, a later passing group in another
            // assessment does not resolve that work. Compatible official evidence above does.
            // A bypass is historical resolution, never achievement or renewed mandatory learning.
            if(previous.state()==State.BYPASSED && bypass.isEmpty()) {steps.add(previous);continue;}
            steps.add(refreshedStep(previous,requirement,next,excluded));
        }
        for(var gap:carried) {
            var required=requirement(gap.getRequirementSnapshot());var current=byKey.get(required.key());
            if(required.provision()==Provision.UNCONFIGURED && current!=null)required=current;
            final var need=required;
            if(row.getArchivedAt()==null && row.getTimingCompletedAt()==null && steps.stream().anyMatch(step->step.kind()==Kind.REQUIRED
                    && step.requirement().key().equals(need.key()) && step.state()!=State.BYPASSED))continue;
            if(steps.stream().anyMatch(step->step.kind()==Kind.PARALLEL_SUPPLEMENT && gap.getBypassId().equals(step.sourceBypassId()) && step.requirement().key().equals(need.key())))continue;
            var next=RequirementPathwayGenerationService.step(row.getRequestId(),required,Kind.PARALLEL_SUPPLEMENT,gap.getBypassId(),fresh,official.get(required.proofKey()));
            if(next.state()!=State.NEEDS_EXPERT_ACTION)steps.add(next);
        }
        return new Plan(steps,plan.dependencies());
    }
    /**
     * Pure per-step refresh: merges a previous step with the regenerated step for fresh provision/evidence. Shared by
     * {@link #refresh} and research adapters so that both apply the same state transition.
     */
    public static Step refreshedStep(Step previous,Requirement requirement,Step next,Set<String> excluded) {
        var state=previous.state()==State.IN_PROGRESS && next.state()==State.NEEDS_SUPPLEMENTATION?State.IN_PROGRESS:next.state();
        String reason=next.reason();
        // Retain original pins for continued reading when provision becomes stale; eligibility still requires fresh validation.
        var options=(next.state()==State.NEEDS_EXPERT_ACTION?previous.options():next.options()).stream()
                .filter(option->!excluded.contains(option.moduleId())).toList();
        if(requirement.provision()==Provision.MODULE_ONLY && options.isEmpty() && state!=State.FULFILLED) {
            state=State.NEEDS_EXPERT_ACTION;reason="PROVISION_REQUIRES_EXPERT_ACTION";
        }
        var certificate=next.state()==State.NEEDS_EXPERT_ACTION?previous.certificate():next.certificate();
        return new Step(previous.id(),requirement,previous.kind(),previous.sourceBypassId(),state,reason,next.fulfilledEvidenceId(),options,certificate,previous.assessedSources());
    }
    private Requirement requirement(String snapshot) {
        try{return json.readValue(snapshot,Requirement.class);}
        catch(Exception invalid){throw new InitialPathwayPorts.Failure(503,"BYPASS_SNAPSHOT_INVALID");}
    }
}
