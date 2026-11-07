package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.InitialPathwayRunEntity;
import com.adaptlearngraph.entities.domain.RequirementPathway;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import java.time.Duration;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Reuses original persisted generation claims/runs. No optimizer, readiness percentage or prerequisite expansion. */
public final class RequirementPathwayGenerationService {
    public record Settings(Duration lease,int maximumAttempts,Duration retry) {
        public Settings {if(lease.isZero() || lease.isNegative() || maximumAttempts<1 || retry.isNegative() || retry.isZero())throw new IllegalArgumentException("Explicit positive worker settings required");}
    }
    private record Claim(UUID id,UUID org,UUID learner,UUID token,RequirementPathwayAdmissionService.Frozen frozen) {}
    private final InitialPathwayRepositories data;private final RequirementPathwayJpaRepository rules;
    private final RequirementPathwayAdmissionService admission;private final RequirementPathwayRevisions revisions;
    private final CurrentRoleSelectionStore selections;private final RuleAssessmentAttemptJpaRepository clock;private final TransactionTemplate tx;private final Settings settings;
    public RequirementPathwayGenerationService(InitialPathwayRepositories data,RequirementPathwayJpaRepository rules,RequirementPathwayAdmissionService admission,
            RequirementPathwayRevisions revisions,CurrentRoleSelectionStore selections,RuleAssessmentAttemptJpaRepository clock,TransactionTemplate tx,Settings settings) {
        this.data=data;this.rules=rules;this.admission=admission;this.revisions=revisions;this.selections=selections;this.clock=clock;this.tx=tx;this.settings=settings;
    }
    public void runOne() {
        var claim=tx.execute(status->{
            var next=rules.next();if(next.isEmpty())return Optional.<Claim>empty();var owner=next.get();
            var row=rules.own(owner.getOrganizationId(),owner.getLearnerId(),owner.getRequestId()).orElseThrow();
            // Counter is read while the queue row is locked; terminal exhaustion remains bound for repair.
            int attempts=countAttempts(owner.getOrganizationId(),owner.getLearnerId(),owner.getRequestId());
            if(rules.automaticAttempts(owner.getOrganizationId(),owner.getLearnerId(),owner.getRequestId()).orElseThrow()>=settings.maximumAttempts()) {
                data.requests().block(owner.getOrganizationId(),owner.getLearnerId(),owner.getRequestId());
                data.runs().insert(new InitialPathwayRunEntity(UUID.randomUUID(),owner.getRequestId(),UUID.randomUUID(),RequirementPathwayAdmissionService.VERSION,"BLOCKED","[\"RETRY_EXHAUSTED\"]",clock.clock()));
                revisions.event(row,attempts,"RULE_PATHWAY_BLOCKED",null,Map.of("reason","RETRY_EXHAUSTED","generationAttempt",attempts));
                return Optional.<Claim>empty();
            }
            UUID token=UUID.randomUUID();
            if(data.requests().startGeneration(owner.getOrganizationId(),owner.getLearnerId(),owner.getRequestId(),token,RequirementPathwayAdmissionService.VERSION,settings.lease().toMillis())!=1)
                throw new Failure(409,"STALE_GENERATION_CLAIM");
            return Optional.of(new Claim(owner.getRequestId(),owner.getOrganizationId(),owner.getLearnerId(),token,admission.decode(row)));
        });
        if(claim==null || claim.isEmpty())return;var claimed=claim.get();
        Plan plan;
        try{plan=initialPlan(claimed.id(),claimed.frozen().input());}
        catch(RuntimeException invalid){finishFailure(claimed,"INVALID_REQUIREMENT_PLAN");return;}
        try {selections.transaction(new RoleBaselineFlow.Actor(claimed.org(),claimed.learner()),()->{
            var row=rules.lock(claimed.org(),claimed.id()).orElseThrow();
            var selection=selections.current(new RoleBaselineFlow.Actor(claimed.org(),claimed.learner()));
            if(selection.isEmpty() || !selection.get().selectionId().equals(row.getSelectionId()) || selection.get().revision()!=row.getSelectionRevision()) {
                data.requests().finish(claimed.org(),claimed.learner(),claimed.id(),claimed.token(),"STALE","SELECTION_CHANGED",settings.retry().toMillis());return null;
            }
            String outcome=claimed.frozen().input().required().isEmpty()?"NO_LEARNING_REQUIRED":"SUCCEEDED";
            if(data.requests().finish(claimed.org(),claimed.learner(),claimed.id(),claimed.token(),outcome,null,settings.retry().toMillis())!=1)return null;
            UUID run=UUID.randomUUID();
            data.runs().insert(new InitialPathwayRunEntity(run,claimed.id(),claimed.token(),RequirementPathwayAdmissionService.VERSION,outcome,"[]",clock.clock()));
            revisions.publish(row,plan,run,"INITIAL",null,null,outcome.equals("NO_LEARNING_REQUIRED")?"NONE":"AWAITING_EXPERT_REVIEW",null);
            return null;
        });}catch(RuntimeException failed){finishFailure(claimed,"GENERATION_COMMIT_RETRY_REQUIRED");throw failed;}
    }
    private int countAttempts(UUID org,UUID learner,UUID id){return rules.attempts(org,learner,id).orElseThrow(()->new Failure(503,"REQUEST_STATE_INVALID"));}
    private void finishFailure(Claim claim,String reason) {
        tx.executeWithoutResult(status->{
            if(data.requests().finish(claim.org(),claim.learner(),claim.id(),claim.token(),"FAILED_RETRYABLE",reason,settings.retry().toMillis())==1) {
                data.runs().insert(new InitialPathwayRunEntity(UUID.randomUUID(),claim.id(),claim.token(),RequirementPathwayAdmissionService.VERSION,"FAILED_RETRYABLE",revisions.encode(List.of(reason)),clock.clock()));
                var row=rules.own(claim.org(),claim.learner(),claim.id()).orElseThrow();
                revisions.event(row,countAttempts(claim.org(),claim.learner(),claim.id()),"RULE_PATHWAY_GENERATION_FAILED",null,Map.of("reason",reason));
            }
        });
    }
    public static Plan initialPlan(UUID request,RequirementPathwayAdmissionService.Input input) {
        var steps=new ArrayList<Step>();
        for(var requirement:input.required())steps.add(step(request,requirement,Kind.REQUIRED,null,input.catalog(),null));
        for(var carried:input.parallel()) {
            var next=step(request,carried.requirement(),Kind.PARALLEL_SUPPLEMENT,carried.bypassId(),input.catalog(),input.official().get(carried.requirement().proofKey()));
            steps.add(new Step(next.id(),next.requirement(),next.kind(),next.sourceBypassId(),next.state(),next.reason(),next.fulfilledEvidenceId(),next.options(),next.certificate(),carried.assessedSources()));
        }
        return new Plan(steps,List.of());
    }
    public static Step step(UUID request,Requirement requirement,Kind kind,UUID bypass,RulePathwayCatalog.Snapshot catalog,UUID official) {
        var options=requirement.provision()==Provision.MODULE_ONLY?catalog.options().getOrDefault(requirement.key(),List.of()).stream().filter(option->option.matches(requirement)).toList():List.<Option>of();
        var certificate=requirement.provision()==Provision.CERTIFICATE_ONLY?catalog.certificates().get(requirement.key()):null;
        var current=catalog.requirements().stream().filter(item->item.key().equals(requirement.key())).findFirst();
        if(current.isEmpty() || !current.get().proofKey().equals(requirement.proofKey()))certificate=null;
        boolean missing=requirement.provision()==Provision.UNCONFIGURED || requirement.provision()==Provision.MODULE_ONLY && options.isEmpty()
                || requirement.provision()==Provision.CERTIFICATE_ONLY && certificate==null;
        State state=official!=null?State.FULFILLED:missing?State.NEEDS_EXPERT_ACTION:State.NEEDS_SUPPLEMENTATION;
        String reason=official!=null?"OFFICIAL_EVIDENCE_ACCEPTED":missing?"PROVISION_REQUIRES_EXPERT_ACTION":kind==Kind.PARALLEL_SUPPLEMENT?"CARRIED_BYPASS_SUPPLEMENT":"LEARNING_OR_CERTIFICATE_REQUIRED";
        return new Step(RequirementPathway.stepId(request,requirement,kind,bypass),requirement,kind,bypass,state,reason,official,options,
                certificate==null?null:new CertificateReference(certificate.id(),certificate.version(),certificate.name(),certificate.referenceUrl()));
    }
}
