package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Refreshes provision/evidence behind the existing revision owner; never turns a diagnostic or bypass into achievement. */
public final class RequirementPathwayPlanningService {
    private final RulePathwayCatalog catalog;private final RequirementPathwayJpaRepository rules;
    private final RequirementPathwayAdmissionService admission;private final RequirementPathwayRevisions revisions;private final ObjectMapper json;
    public RequirementPathwayPlanningService(RulePathwayCatalog catalog,RequirementPathwayJpaRepository rules,RequirementPathwayAdmissionService admission,
            RequirementPathwayRevisions revisions,ObjectMapper json) {this.catalog=catalog;this.rules=rules;this.admission=admission;this.revisions=revisions;this.json=json;}
    public Plan refresh(RequirementPathwayJpaRepository.Row row,Plan plan) {
        var input=admission.decode(row).input();var scope=new RoleBaselineFlow.Actor(row.getOrganizationId(),row.getLearnerId());
        var requested=plan.steps().stream().filter(step->step.state()!=State.FULFILLED).map(Step::requirement).toList();
        var strict=new HashSet<String>();plan.steps().stream().filter(step->step.kind()==Kind.REQUIRED && step.state()!=State.FULFILLED && step.state()!=State.BYPASSED)
                .forEach(step->strict.add(step.requirement().key()));
        var fresh=catalog.providers(scope,input.roleSnapshot(),input.binding().levelId(),requested,strict);
        var byKey=new HashMap<String,Requirement>();fresh.requirements().forEach(requirement->byKey.put(requirement.key(),requirement));
        var requirements=new ArrayList<Requirement>();
        for(var step:plan.steps()) {
            var requirement=step.requirement();var current=byKey.get(requirement.key());
            // Unknown provision has no invented outcome/version. Adopt only the real published configuration once available.
            if(requirement.provision()==Provision.UNCONFIGURED && current!=null && current.provision()!=Provision.UNCONFIGURED)requirement=current;
            requirements.add(requirement);
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
            var requirement=requirements.get(i);
            var next=RequirementPathwayGenerationService.step(row.getRequestId(),requirement,previous.kind(),previous.sourceBypassId(),fresh,official.get(requirement.proofKey()));
            // An explicit bypass of already available work remains scoped. Only a previously missing provision is backfilled.
            if(previous.state()==State.BYPASSED && (next.state()==State.NEEDS_EXPERT_ACTION || !previous.options().isEmpty() || previous.certificate()!=null)) {steps.add(previous);continue;}
            var state=previous.state()==State.IN_PROGRESS && next.state()==State.NEEDS_SUPPLEMENTATION?State.IN_PROGRESS:next.state();
            String reason=previous.state()==State.BYPASSED && next.state()!=State.FULFILLED?"PROVISION_AVAILABLE_AFTER_BYPASS":next.reason();
            // Retain original pins for continued reading when provision becomes stale; eligibility still requires fresh validation.
            var options=(next.state()==State.NEEDS_EXPERT_ACTION?previous.options():next.options()).stream()
                    .filter(option->!excluded.contains(option.moduleId())).toList();
            if(requirement.provision()==Provision.MODULE_ONLY && options.isEmpty() && state!=State.FULFILLED) {
                state=State.NEEDS_EXPERT_ACTION;reason="PROVISION_REQUIRES_EXPERT_ACTION";
            }
            var certificate=next.state()==State.NEEDS_EXPERT_ACTION?previous.certificate():next.certificate();
            steps.add(new Step(previous.id(),requirement,previous.kind(),previous.sourceBypassId(),state,reason,next.fulfilledEvidenceId(),options,certificate,previous.assessedSources()));
        }
        return new Plan(steps,plan.dependencies());
    }
}
