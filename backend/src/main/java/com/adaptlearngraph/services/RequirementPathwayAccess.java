package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.entities.domain.ModuleAuthoring;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Exact requirement content admission. Reading or starting content never awards official achievement. */
public final class RequirementPathwayAccess {
    private final Actors actors;private final CurrentRoleSelectionStore selections;private final RequirementPathwayJpaRepository rules;
    private final RequirementPathwayRevisions revisions;private final RequirementPathwayAdmissionService admission;
    private final ReviewAssignments assignments;private final InitialPathwayRepositories data;private final RulePathwayCatalog catalog;
    private final ModuleAuthoringPort modules;private final ObjectMapper json;
    private RuleAssessmentContextJpaRepository assessmentEvidence;
    public RequirementPathwayAccess assessmentEvidence(RuleAssessmentContextJpaRepository evidence) {
        this.assessmentEvidence=Objects.requireNonNull(evidence);return this;
    }
    public RequirementPathwayAccess(Actors actors,CurrentRoleSelectionStore selections,RequirementPathwayJpaRepository rules,
            RequirementPathwayRevisions revisions,RequirementPathwayAdmissionService admission,ReviewAssignments assignments,
            InitialPathwayRepositories data,RulePathwayCatalog catalog,ModuleAuthoringPort modules,ObjectMapper json) {
        this.actors=actors;this.selections=selections;this.rules=rules;this.revisions=revisions;this.admission=admission;
        this.assignments=assignments;this.data=data;this.catalog=catalog;this.modules=modules;this.json=json;
    }
    private Requirement requirement(String snapshot) {
        try{return json.readValue(snapshot,Requirement.class);}catch(Exception invalid){throw new Failure(503,"PATHWAY_REQUIREMENT_INTEGRITY_FAILURE");}
    }
    public void require(String moduleId,Integer requestedRevision) {
        InitialPathwayPorts.text(moduleId);var actor=actors.require();actor.require(Role.EMPLOYEE);
        var owner=new RoleBaselineFlow.Actor(actor.organizationId(),actor.accountId());
        selections.transaction(owner,()->requireModule(actor,owner,moduleId,requestedRevision));
    }
    /** Expected admission denials are values, caught before leaving the participating transaction. */
    public boolean permits(String moduleId,Integer requestedRevision) {
        InitialPathwayPorts.text(moduleId);var actor=actors.require();actor.require(Role.EMPLOYEE);
        var owner=new RoleBaselineFlow.Actor(actor.organizationId(),actor.accountId());
        return selections.transaction(owner,()->{
            try {requireModule(actor,owner,moduleId,requestedRevision);return true;}
            catch(Failure denied) {if(denied.status()>=500)throw denied;return false;}
        });
    }
    public boolean containsModule(String moduleId) {
        var actor=actors.require();actor.require(Role.EMPLOYEE);
        return rules.current(actor.organizationId(),actor.accountId()).stream()
            .anyMatch(row->revisions.read(row).steps().stream().anyMatch(step->step.options().stream().anyMatch(option->option.moduleId().equals(moduleId))));
    }
    private Void requireModule(Actor actor,RoleBaselineFlow.Actor owner,String moduleId,Integer requestedRevision) {
        if(!actor.equals(actors.require()))throw new Failure(403,"FORBIDDEN");
        var document=modules.lock(actor.organizationId().toString(),moduleId).orElseThrow(()->new Failure(404,"MODULE_NOT_FOUND"));
        var pin=modules.pinned(actor.organizationId().toString(),actor.accountId().toString(),moduleId);
        int version=requestedRevision!=null?requestedRevision:pin.orElse(document.releasedRevision()==null?0:document.releasedRevision());
        var packageRevision=document.revisions().stream().filter(item->item.number()==version).findFirst().orElseThrow(()->new Failure(409,"LEARNING_PACKAGE_UNAVAILABLE"));
        // Enforce newly discovered dependencies before accepting any historical content pin.
        // Continue an authentic, formerly accepted package even after target change or later supplementation/review.
        var started=rules.startedModules(actor.organizationId(),actor.accountId(),List.of(moduleId));
        if(started.size()>1000)throw new Failure(503,"LEARNING_ACCESS_HISTORY_LIMIT");
        if(pin.filter(number->number==version).isPresent() && started.stream().anyMatch(proof->proof.getModuleRevision()==version
                && proof.getContentVersion().equals(packageRevision.payload().contentVersion()) && matches(packageRevision,requirement(proof.getRequirementSnapshot()))))return null;
        if(packageRevision.payload().teachings().size()==1)requireKnowledge(packageRevision.payload().teachings().getFirst().skillId(),packageRevision.payload().knowledgeLevel(),packageRevision.payload().skillVersion());
        var current=rules.current(actor.organizationId(),actor.accountId());
        if(current.size()!=1)throw new Failure(403,"PATHWAY_NOT_APPROVED");var row=current.getFirst();
        var selected=selections.current(owner).orElseThrow(()->new Failure(403,"TARGET_SELECTION_REQUIRED"));
        if(!selected.selectionId().equals(row.getSelectionId()) || selected.revision()!=row.getSelectionRevision())throw new Failure(409,"TARGET_SELECTION_CHANGED");
        var plan=revisions.read(row);
        var candidates=plan.steps().stream().filter(step->step.requirement().provision()==Provision.MODULE_ONLY
                && step.options().stream().anyMatch(option->option.moduleId().equals(moduleId) && option.moduleRevision()==version
                    && option.contentVersion().equals(packageRevision.payload().contentVersion()))).toList();
        if(candidates.isEmpty())throw new Failure(403,"MODULE_NOT_IN_APPROVED_REQUIREMENT");
        var input=admission.decode(row).input();
        for(var step:candidates) {
            requireAccepted(row,step);
            if(step.state()==State.NEEDS_EXPERT_ACTION || !matches(packageRevision,step.requirement()))continue;
            var fresh=catalog.providers(owner,input.roleSnapshot(),input.binding().levelId(),List.of(step.requirement()),Set.of(step.requirement().key()));
            boolean available=fresh.requirements().stream().anyMatch(required->required.proofKey().equals(step.requirement().proofKey()) && required.provision()==Provision.MODULE_ONLY)
                    && fresh.options().getOrDefault(step.requirement().key(),List.of()).stream().anyMatch(option->option.moduleId().equals(moduleId)
                        && option.moduleRevision()==version && option.contentVersion().equals(packageRevision.payload().contentVersion()));
            if(!available)continue;
            requireDependencies(actor,plan,step);
            return null;
        }
        throw new Failure(409,"EXACT_REQUIREMENT_PROVIDER_UNAVAILABLE");
    }
    public void requireAccepted(RequirementPathwayJpaRepository.Row row,Step step) {
        if(!acceptedSteps(row,new Plan(List.of(step),List.of())).contains(step.id()))throw new Failure(403,"PATHWAY_NOT_APPROVED");
    }
    public void requireReady(RequirementPathwayJpaRepository.Row row,Step step) {
        var actor=actors.require();actor.require(Role.EMPLOYEE);
        if(!actor.organizationId().equals(row.getOrganizationId()) || !actor.accountId().equals(row.getLearnerId()))throw new Failure(403,"FORBIDDEN");
        requireAccepted(row,step);requireDependencies(actor,revisions.read(row),step);
    }
    /** Shared guard also covers alternative modules and independent-learning assessment entry. */
    public void requireKnowledge(String skill,com.adaptlearngraph.entities.domain.KnowledgeLevel level,String version) {
        var actor=actors.require();actor.require(Role.EMPLOYEE);
        // Wait for the frozen result projection before admitting lower-level alternatives.
        if(assessmentEvidence==null)throw new Failure(503,"ASSESSMENT_EVIDENCE_AUTHORIZATION_UNAVAILABLE");
        if(assessmentEvidence.projectionPending(actor.organizationId(),actor.accountId(),skill,version))throw new Failure(423,"ASSESSMENT_RESULT_PROCESSING");
        var rows=rules.current(actor.organizationId(),actor.accountId());
        if(rows.size()>1)throw new Failure(503,"CURRENT_PATHWAY_INTEGRITY_FAILURE");
        for(var row:rows) {
            var plan=revisions.read(row);
            for(var step:plan.steps())if(step.state()!=State.BYPASSED && step.requirement().skillId().equals(skill)
                    && step.requirement().knowledgeLevel()==level && Objects.equals(step.requirement().skillVersion(),version))
                requireDependencies(actor,plan,step);
        }
    }
    private void requireDependencies(Actor actor,Plan plan,Step step) {
        var needs=plan.dependencies().stream().filter(edge->edge.dependentStepId().equals(step.id()))
                .map(edge->plan.steps().stream().filter(item->item.id().equals(edge.prerequisiteStepId())).findFirst().orElseThrow().requirement()).toList();
        if(needs.isEmpty())return;
        var official=new HashSet<String>();
        for(var proof:rules.official(actor.organizationId(),actor.accountId(),revisions.encode(needs)))official.add(requirement(proof.getRequirementSnapshot()).proofKey());
        for(var need:needs)if(!official.contains(need.proofKey())
                && !(assessmentEvidence!=null && assessmentEvidence.assessed(actor.organizationId(),actor.accountId(),need.skillId(),need.knowledgeLevel().name(),need.skillVersion()).orElse(false))
                && plan.steps().stream().noneMatch(s->s.requirement().proofKey().equals(need.proofKey()) && s.state()==State.BYPASSED))
            throw new Failure(423,"REQUIRED_SUPPLEMENT_NOT_READY");
    }
    /** Content completion is retained, but a new assessment waits for all foundation evidence. */
    public void requireAssessment(UUID stepId) {
        var actor=actors.require();actor.require(Role.EMPLOYEE);var rows=rules.current(actor.organizationId(),actor.accountId());
        if(rows.size()!=1)throw new Failure(403,"PATHWAY_NOT_APPROVED");var row=rows.getFirst();
        var plan=revisions.read(row);
        var step=plan.steps().stream().filter(item->item.id().equals(stepId) && item.requirement().provision()==Provision.MODULE_ONLY)
                .findFirst().orElseThrow(()->new Failure(404,"REQUIREMENT_NOT_FOUND"));
        requireAccepted(row,step);
        requireDependencies(actor,plan,step);
    }
    public Set<UUID> acceptedSteps(RequirementPathwayJpaRepository.Row row,Plan plan) {
        // A completed/archived pathway retains its real immutable approval and readable history.
        if((row.getArchivedAt()!=null || row.getTimingCompletedAt()!=null) && row.getCurrentRevision()!=null
                && rules.historicallyApproved(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),row.getCurrentRevision()))
            return plan.steps().stream().map(Step::id).collect(java.util.stream.Collectors.toUnmodifiableSet());
        if("APPROVED".equals(row.getReviewStatus())) {
            long basis=row.getApprovalBasisRevision()==null?row.getCurrentRevision():row.getApprovalBasisRevision();
            var original=data.revisions().content(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),basis);
            if(original.size()!=1)throw new Failure(403,"PATHWAY_APPROVAL_INVALID");
            assignments.requireApprovalValid(new Scope(row.getOrganizationId(),row.getLearnerId()),row.getRequestId(),basis,original.getFirst().contentHash());
            return plan.steps().stream().map(Step::id).collect(java.util.stream.Collectors.toUnmodifiableSet());
        }
        // No mandatory plan needs a new approval. The carried parallel root retains its original real bypass/approval provenance.
        if("NO_LEARNING_REQUIRED".equals(row.getGenerationStatus()) && "NONE".equals(row.getReviewStatus())) {
            var carried=rules.carried(row.getOrganizationId(),row.getLearnerId());
            if(carried.size()>1000)throw new Failure(503,"BYPASS_HISTORY_LIMIT");
            var anchors=carried.stream().map(RequirementPathwayJpaRepository.Carried::getBypassId).collect(java.util.stream.Collectors.toSet());
            return plan.steps().stream().filter(step->step.kind()==Kind.PARALLEL_SUPPLEMENT && anchors.contains(step.sourceBypassId()))
                    .map(Step::id).collect(java.util.stream.Collectors.toUnmodifiableSet());
        }
        return Set.of();
    }
    private static boolean matches(ModuleAuthoring.Revision revision,Requirement required) {
        var payload=revision.payload();return payload.teachings().size()==1 && payload.teachings().getFirst().skillId().equals(required.skillId())
                && payload.knowledgeLevel()==required.knowledgeLevel() && Objects.equals(payload.skillVersion(),required.skillVersion());
    }
}
