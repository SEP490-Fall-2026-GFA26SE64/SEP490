package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.InitialPathwayApprovalEntity;
import com.adaptlearngraph.entities.InitialPathwayOverrideEntity;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.util.*;
import java.util.function.Supplier;

/** Assigned Expert actions on the original review/approval/receipt owner; no client actor or tenant fields. */
public final class RequirementPathwayReviewService {
    public record Expected(long revision,String contentHash) {}
    public record Bypass(Expected expected,UUID stepId,String reason) {}
    public record Reject(Expected expected,String reason) {}
    public record Summary(UUID requestId,UUID learnerId,String learnerName,String roleName,String levelName,String generationStatus,
            String reviewStatus,String reasonCode,Long revision,String contentHash) {}
    public record Candidate(UUID stepId,Option module) {}
    public record ModuleKey(String moduleId,int moduleRevision,String contentVersion) {}
    public record StepSelection(UUID stepId,List<ModuleKey> options) {}
    public record Selection(Expected expected,List<StepSelection> selections,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) List<UUID> stepOrder) {
        public Selection(Expected expected,List<StepSelection> selections){this(expected,selections,null);}
    }
    public record SelectionPreview(Plan plan,RequirementPathwayValidationService.Checked validation) {}
    public record Detail(Summary status,Plan plan,RequirementPathwayValidationService.Checked validation,boolean archived,List<Candidate> candidates,List<RulePathwayCatalog.Related> related,List<UUID> reorderableStepIds,List<UUID> bypassableStepIds) {}
    public record ReviewState(String status,Long basis) {}
    private final Actors actors;private final ReviewAssignments assignments;private final CurrentRoleSelectionStore selections;
    private final RequirementPathwayJpaRepository rules;private final InitialPathwayRepositories data;private final RequirementPathwayAdmissionService admission;
    private final RequirementPathwayRevisions revisions;private final RequirementPathwayValidationService validation;private final RulePathwayCatalog catalog;
    private final Receipts receipts;private final RuleAssessmentAttemptJpaRepository clock;
    private final RequirementPathwayPlanningService planning;
    public RequirementPathwayReviewService(Actors actors,ReviewAssignments assignments,CurrentRoleSelectionStore selections,RequirementPathwayJpaRepository rules,
            InitialPathwayRepositories data,RequirementPathwayAdmissionService admission,RequirementPathwayRevisions revisions,
            RequirementPathwayValidationService validation,RulePathwayCatalog catalog,Receipts receipts,RuleAssessmentAttemptJpaRepository clock,RequirementPathwayPlanningService planning) {
        this.actors=actors;this.assignments=assignments;this.selections=selections;this.rules=rules;this.data=data;this.admission=admission;
        this.revisions=revisions;this.validation=validation;this.catalog=catalog;this.receipts=receipts;this.clock=clock;this.planning=planning;
    }
    private Actor expert(){var actor=actors.require();actor.require(Role.DOMAIN_EXPERT);return actor;}
    private void reauthorize(Actor actor,UUID id,Assignment expected) {
        if(!actor.equals(expert()) || !expected.equals(assignments.require(actor,id)))throw new Failure(409,"REVIEW_ASSIGNMENT_CHANGED");
    }
    public List<Summary> queue(int offset,int limit) {
        var actor=expert();if(offset<0 || offset>1000 || limit<1 || limit>100)throw new Failure(400,"INVALID_PAGINATION");
        var ids=assignments.assignedPathways(actor);if(ids.isEmpty())return List.of();
        var rows=rules.assigned(actor.organizationId(),ids,offset,limit);var labels=new HashMap<UUID,String>();
        var learners=rows.stream().map(RequirementPathwayJpaRepository.Row::getLearnerId).collect(java.util.stream.Collectors.toSet());
        if(!learners.isEmpty())data.actors().workspaceNames(actor.organizationId(),learners).forEach(label->labels.put(label.learnerId(),label.fullName()));
        if(!actor.equals(expert()))throw new Failure(403,"FORBIDDEN");
        return rows.stream().map(row->summary(row,labels.get(row.getLearnerId()))).toList();
    }
    public Detail detail(UUID id) {
        var actor=expert();var assignment=assignments.require(actor,id);
        var row=rules.ownForExpert(actor.organizationId(),id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        var detail=detail(row);reauthorize(actor,id,assignment);return detail;
    }
    private Detail detail(RequirementPathwayJpaRepository.Row row) {
        var names=data.actors().workspaceFullName(row.getOrganizationId(),row.getLearnerId());
        var plan=revisions.read(row);
        var providers=row.getArchivedAt()!=null?null:validation.providers(row,plan);
        return new Detail(summary(row,names.isEmpty()?null:names.getFirst()),plan,validation.check(row),row.getArchivedAt()!=null,
                providers==null?List.of():candidates(plan,providers),providers==null?List.of():providers.related(),
                row.getArchivedAt()!=null || !Set.of("AWAITING_EXPERT_REVIEW","REJECTED").contains(row.getReviewStatus())?List.of():reorderableSteps(row,plan),
                providers==null?List.of():plan.steps().stream().filter(step->canBypass(step,providers)).map(Step::id).toList());
    }
    private static boolean canBypass(Step step,RulePathwayCatalog.Snapshot fresh) {
        if(step.kind()!=Kind.REQUIRED || step.state()==State.FULFILLED || step.state()==State.BYPASSED)return false;
        var current=fresh.requirements().stream().filter(need->need.key().equals(step.requirement().key())).findFirst();
        if(current.isEmpty())return false; // Unavailable scope is not proof that provision is missing.
        var need=current.get();
        if(step.requirement().provision()!=Provision.UNCONFIGURED && !need.equals(step.requirement()))return false;
        return fresh.options().getOrDefault(need.key(),List.of()).stream().noneMatch(option->option.matches(need))
                && !fresh.certificates().containsKey(need.key());
    }
    private List<UUID> reorderableSteps(RequirementPathwayJpaRepository.Row row,Plan plan) {
        var fixed=new HashSet<UUID>();
        plan.dependencies().forEach(edge->{fixed.add(edge.prerequisiteStepId());fixed.add(edge.dependentStepId());});
        plan.steps().stream().filter(step->step.state()==State.FULFILLED || step.state()==State.BYPASSED || step.state()==State.IN_PROGRESS)
                .forEach(step->fixed.add(step.id()));
        rules.progress(row.getOrganizationId(),row.getLearnerId(),revisions.encode(plan)).stream()
                .filter(item->item.getStartedAt()!=null || item.getCompletedAt()!=null).forEach(item->fixed.add(item.getStepId()));
        return plan.steps().stream().map(Step::id).filter(id->!fixed.contains(id)).toList();
    }
    private List<Candidate> candidates(RequirementPathwayJpaRepository.Row row,Plan plan) {
        return candidates(plan,validation.providers(row,plan));
    }
    private List<Candidate> candidates(Plan plan,RulePathwayCatalog.Snapshot fresh) {
        var result=new ArrayList<Candidate>();
        for(var step:plan.steps())for(var option:fresh.options().getOrDefault(step.requirement().key(),List.of()))
            result.add(new Candidate(step.id(),option));
        if(result.size()>1000)throw new Failure(422,"MODULE_CATALOG_CAPACITY");
        return List.copyOf(result);
    }
    private Plan selectedPlan(RequirementPathwayJpaRepository.Row row,Selection command) {
        if(!Set.of("AWAITING_EXPERT_REVIEW","REJECTED").contains(row.getReviewStatus()))throw new Failure(409,"PATHWAY_NOT_AWAITING_REVIEW");
        if(command.selections()==null || command.selections().size()>1000)throw new Failure(400,"INVALID_MODULE_SELECTION");
        var original=revisions.read(row);var available=candidates(row,original);var requested=new HashMap<UUID,List<ModuleKey>>();
        for(var selection:command.selections()) {
            if(selection==null || selection.stepId()==null || selection.options()==null || selection.options().size()>1000
                    || selection.options().stream().anyMatch(Objects::isNull)
                    || new HashSet<>(selection.options()).size()!=selection.options().size()
                    || requested.put(selection.stepId(),selection.options())!=null)throw new Failure(400,"INVALID_MODULE_SELECTION");
        }
        var editable=original.steps().stream().filter(step->step.requirement().provision()==Provision.MODULE_ONLY
                && step.state()!=State.FULFILLED && step.state()!=State.BYPASSED).map(Step::id).collect(java.util.stream.Collectors.toSet());
        if(!requested.keySet().equals(editable))throw new Failure(400,"REQUIRED_STEP_SELECTION_MISMATCH");
        var progress=rules.progress(row.getOrganizationId(),row.getLearnerId(),revisions.encode(original));
        var steps=new ArrayList<Step>();
        for(var step:original.steps()) {
            if(!editable.contains(step.id())){steps.add(step);continue;}
            var options=new ArrayList<Option>();
            for(var key:requested.get(step.id()))options.add(available.stream().filter(candidate->candidate.stepId().equals(step.id())
                    && candidate.module().moduleId().equals(key.moduleId()) && candidate.module().moduleRevision()==key.moduleRevision()
                    && candidate.module().contentVersion().equals(key.contentVersion())).map(Candidate::module).findFirst()
                    .orElseThrow(()->new Failure(409,"MODULE_OPTION_NO_LONGER_ELIGIBLE")));
            if(progress.stream().anyMatch(item->item.getStepId().equals(step.id()) && (item.getStartedAt()!=null || item.getCompletedAt()!=null)
                    && options.stream().noneMatch(option->option.moduleId().equals(item.getModuleId()) && option.moduleRevision()==item.getModuleRevision())))
                throw new Failure(409,"STARTED_MODULE_CANNOT_BE_EXCLUDED");
            options.sort(Comparator.comparing(Option::moduleId).thenComparingInt(Option::moduleRevision));
            var state=options.isEmpty()?State.NEEDS_EXPERT_ACTION:step.state()==State.IN_PROGRESS?State.IN_PROGRESS:State.NEEDS_SUPPLEMENTATION;
            // Match the provision refresh reason. Expert provenance is recorded in
            // the immutable override/audit, rather than causing a cosmetic revision.
            String reason=options.isEmpty()?"PROVISION_REQUIRES_EXPERT_ACTION":
                    step.kind()==Kind.PARALLEL_SUPPLEMENT?"CARRIED_BYPASS_SUPPLEMENT":"LEARNING_OR_CERTIFICATE_REQUIRED";
            steps.add(new Step(step.id(),step.requirement(),step.kind(),step.sourceBypassId(),state,
                    reason,null,options,null,step.assessedSources()));
        }
        if(command.stepOrder()!=null) {
            var order=command.stepOrder();var originalIds=original.steps().stream().map(Step::id).toList();
            if(order.size()!=originalIds.size() || new HashSet<>(order).size()!=order.size() || !new HashSet<>(order).equals(new HashSet<>(originalIds)))
                throw new Failure(400,"INVALID_REQUIREMENT_ORDER");
            var movable=new HashSet<>(reorderableSteps(row,original));
            for(int i=0;i<originalIds.size();i++)if(!movable.contains(originalIds.get(i)) && !originalIds.get(i).equals(order.get(i)))
                throw new Failure(409,"PREREQUISITE_POSITION_LOCKED");
            var byId=new HashMap<UUID,Step>();steps.forEach(step->byId.put(step.id(),step));
            steps=new ArrayList<>(order.stream().map(byId::get).toList());
        }
        return new Plan(steps,original.dependencies());
    }
    public SelectionPreview checkSelection(UUID id,Selection command) {
        if(command==null)throw new Failure(400,"INVALID_REQUEST");
        var actor=expert();var assignment=assignments.require(actor,id);
        return owned(actor,id,assignment,()->{var row=editable(actor,id,command.expected());var plan=selectedPlan(row,command);
            var result=new SelectionPreview(plan,validation.check(row,plan));reauthorize(actor,id,assignment);return result;});
    }
    public Receipt saveSelection(UUID id,String key,Selection command) {
        if(command==null)throw new Failure(400,"INVALID_REQUEST");
        var actor=expert();var assignment=assignments.require(actor,id);InitialPathwayPorts.commandKey(key);
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(id,command)));
        return owned(actor,id,assignment,()->{
            var retained=replay(actor,"RULE_MODULE_SELECTION",key,hash);if(retained.isPresent())return retained.get();
            var row=editable(actor,id,command.expected());var original=revisions.read(row);var next=selectedPlan(row,command);
            reauthorize(actor,id,assignment);
            if(!next.equals(original)) {
                long revision=revisions.publish(row,next,row.getRunId(),"EXPERT",null,null,"AWAITING_EXPERT_REVIEW",actor.accountId());
                var before=new HashSet<String>();var after=new HashSet<String>();
                original.steps().forEach(step->step.options().forEach(option->before.add(option.moduleId())));
                next.steps().forEach(step->step.options().forEach(option->after.add(option.moduleId())));
                var changed=new TreeSet<String>();changed.addAll(before);changed.addAll(after);
                candidates(row,original).forEach(candidate->changed.add(candidate.module().moduleId()));
                for(var module:changed)
                    data.overrides().insert(new InitialPathwayOverrideEntity(UUID.randomUUID(),id,row.getCurrentRevision(),revision,actor.organizationId(),actor.accountId(),
                            assignment.id(),assignment.version(),after.contains(module)?"INCLUDE":"EXCLUDE",module,"EXPERT_MODULE_SELECTION",clock.clock()));
            }
            return retain(actor,"RULE_MODULE_SELECTION",key,hash,rules.own(actor.organizationId(),row.getLearnerId(),id).orElseThrow());
        });
    }
    private Summary summary(RequirementPathwayJpaRepository.Row row,String label) {
        var binding=admission.decode(row).input().binding();
        return new Summary(row.getRequestId(),row.getLearnerId(),label==null||label.isBlank()?row.getLearnerId().toString():label,
                binding.roleName(),binding.levelName(),row.getGenerationStatus(),row.getReviewStatus(),row.getReasonCode(),row.getCurrentRevision(),row.getContentHash());
    }
    private <T>T owned(Actor actor,UUID id,Assignment assignment,Supplier<T> work) {
        var initial=rules.ownForExpert(actor.organizationId(),id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        return selections.transaction(new RoleBaselineFlow.Actor(actor.organizationId(),initial.getLearnerId()),()->{reauthorize(actor,id,assignment);return work.get();});
    }
    private RequirementPathwayJpaRepository.Row editable(Actor actor,UUID id,Expected expected) {
        if(expected==null || expected.revision()<1 || expected.contentHash()==null || !expected.contentHash().matches("[0-9a-f]{64}"))throw new Failure(400,"INVALID_REQUEST");
        var row=rules.lock(actor.organizationId(),id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        if(row.getArchivedAt()!=null)throw new Failure(409,"PATHWAY_ARCHIVED");
        if(!Objects.equals(row.getCurrentRevision(),expected.revision()) || !Objects.equals(row.getContentHash(),expected.contentHash()))throw new Failure(409,"STALE_PATHWAY_REVISION");
        return row;
    }
    private Optional<Receipt> replay(Actor actor,String operation,String key,String hash) {
        var receipt=receipts.find(actor,operation,"RULE_PATHWAY_ACTION",key);
        if(receipt.isPresent() && !hash.equals(receipt.get().bodyHash()))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return receipt;
    }
    private Receipt retain(Actor actor,String operation,String key,String hash,RequirementPathwayJpaRepository.Row row) {
        var result=new Receipt(200,hash,revisions.encode(Map.of("requestId",row.getRequestId(),"revision",row.getCurrentRevision(),"contentHash",row.getContentHash(),"reviewStatus",row.getReviewStatus())));
        receipts.save(actor,operation,"RULE_PATHWAY_ACTION",key,result);return result;
    }
    public Receipt approve(UUID id,String key,Expected expected) {
        var actor=expert();var assignment=assignments.require(actor,id);InitialPathwayPorts.commandKey(key);
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(id,expected)));
        return owned(actor,id,assignment,()->{
            var retained=replay(actor,"RULE_APPROVE",key,hash);if(retained.isPresent())return retained.get();
            var row=editable(actor,id,expected);if(!Set.of("AWAITING_EXPERT_REVIEW","REJECTED").contains(row.getReviewStatus()))throw new Failure(409,"PATHWAY_NOT_AWAITING_REVIEW");
            var checked=validation.check(row);if(!checked.valid())throw new Failure(422,"PATHWAY_VALIDATION_REQUIRED");
            reauthorize(actor,id,assignment);
            var selected=selections.current(new RoleBaselineFlow.Actor(row.getOrganizationId(),row.getLearnerId()))
                    .filter(value->value.selectionId().equals(row.getSelectionId()) && value.revision()==row.getSelectionRevision())
                    .orElseThrow(()->new Failure(409,"STALE_SELECTION"));
            var approvedAt=new PathwayTiming(rules,clock).firstApproval(row,selected.role(),selected.levelId(),revisions);
            data.approvals().insert(new InitialPathwayApprovalEntity(id,row.getCurrentRevision(),row.getContentHash(),actor.organizationId(),actor.accountId(),assignment.id(),assignment.version(),approvedAt));
            if(data.current().approve(actor.organizationId(),row.getLearnerId(),id,row.getCurrentRevision(),row.getContentHash())!=1)throw new Failure(409,"STALE_PATHWAY_REVISION");
            revisions.event(row,row.getCurrentRevision(),"RULE_PATHWAY_APPROVED",actor.accountId(),Map.of("assignmentId",assignment.id(),"assignmentVersion",assignment.version()));
            revisions.complete(row,revisions.read(row),"APPROVED");
            return retain(actor,"RULE_APPROVE",key,hash,rules.own(actor.organizationId(),row.getLearnerId(),id).orElseThrow());
        });
    }
    public ReviewState nextReview(RequirementPathwayJpaRepository.Row row) {
        if(!"APPROVED".equals(row.getReviewStatus()))return new ReviewState(row.getReviewStatus(),null);
        long basis=row.getApprovalBasisRevision()==null?row.getCurrentRevision():row.getApprovalBasisRevision();
        var original=data.revisions().content(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),basis);
        if(original.size()!=1)return new ReviewState("AWAITING_EXPERT_REVIEW",null);
        try {
            assignments.requireApprovalValid(new Scope(row.getOrganizationId(),row.getLearnerId()),row.getRequestId(),basis,original.getFirst().contentHash());
            return new ReviewState("APPROVED",basis);
        }catch(com.adaptlearngraph.exception.InitialPathwayFailure changed) {
            if(changed.status()>=500)throw changed;return new ReviewState("AWAITING_EXPERT_REVIEW",null);
        }
    }
    public Receipt reject(UUID id,String key,Reject command) {
        var actor=expert();var assignment=assignments.require(actor,id);InitialPathwayPorts.commandKey(key);
        if(command==null || command.reason()==null || command.reason().isBlank() || command.reason().length()>4000)
            throw new Failure(400,"REJECTION_REASON_REQUIRED");
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(id,command)));
        return owned(actor,id,assignment,()->{
            var retained=replay(actor,"RULE_REJECT",key,hash);if(retained.isPresent())return retained.get();
            var row=editable(actor,id,command.expected());
            if(!"AWAITING_EXPERT_REVIEW".equals(row.getReviewStatus()))throw new Failure(409,"PATHWAY_NOT_AWAITING_REVIEW");
            reauthorize(actor,id,assignment);
            if(rules.reject(actor.organizationId(),row.getLearnerId(),id,row.getCurrentRevision())!=1)throw new Failure(409,"STALE_PATHWAY_REVISION");
            revisions.event(row,row.getCurrentRevision(),"RULE_PATHWAY_REJECTED",actor.accountId(),Map.of("reason",command.reason().trim()));
            return retain(actor,"RULE_REJECT",key,hash,rules.own(actor.organizationId(),row.getLearnerId(),id).orElseThrow());
        });
    }
    public Receipt bypass(UUID id,String key,Bypass command) {
        var actor=expert();var assignment=assignments.require(actor,id);InitialPathwayPorts.commandKey(key);
        UUID retry;try{retry=UUID.fromString(key);}catch(RuntimeException invalid){throw new Failure(400,"INVALID_IDEMPOTENCY_KEY");}
        if(command==null || command.stepId()==null || command.reason()==null || command.reason().isBlank() || command.reason().length()>4000)throw new Failure(400,"BYPASS_REASON_REQUIRED");
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(id,command)));
        return owned(actor,id,assignment,()->{
            var retained=replay(actor,"RULE_BYPASS",key,hash);if(retained.isPresent())return retained.get();
            var row=editable(actor,id,command.expected());var plan=revisions.read(row);
            var step=plan.steps().stream().filter(item->item.id().equals(command.stepId()) && item.kind()==Kind.REQUIRED).findFirst().orElseThrow(()->new Failure(404,"REQUIREMENT_NOT_FOUND"));
            if(step.state()==State.FULFILLED || step.state()==State.BYPASSED)throw new Failure(409,"REQUIREMENT_ALREADY_RESOLVED_OR_BYPASSED");
            if(!canBypass(step,validation.providers(row,plan)))throw new Failure(409,"REQUIREMENT_BYPASS_NOT_ALLOWED");
            var review=nextReview(row);reauthorize(actor,id,assignment);
            rules.bypass(UUID.randomUUID(),actor.organizationId(),row.getLearnerId(),id,row.getCurrentRevision(),step.id(),actor.accountId(),revisions.encode(assignment),command.reason().trim(),retry);
            var steps=plan.steps().stream().map(item->item.id().equals(step.id())?new Step(item.id(),item.requirement(),item.kind(),item.sourceBypassId(),State.BYPASSED,command.reason().trim(),null,item.options(),item.certificate(),item.assessedSources()):item).toList();
            long revision=revisions.publish(row,new Plan(steps,plan.dependencies()),row.getRunId(),"EXPERT",null,review.basis(),review.status(),actor.accountId());
            revisions.event(row,revision,"RULE_REQUIREMENT_BYPASSED",actor.accountId(),Map.of("stepId",step.id(),"reason",command.reason().trim()));
            return retain(actor,"RULE_BYPASS",key,hash,rules.own(actor.organizationId(),row.getLearnerId(),id).orElseThrow());
        });
    }
    public Receipt refresh(UUID id,String key,Expected expected) {
        var actor=expert();var assignment=assignments.require(actor,id);InitialPathwayPorts.commandKey(key);
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(id,expected)));
        return owned(actor,id,assignment,()->{
            var retained=replay(actor,"RULE_REFRESH",key,hash);if(retained.isPresent())return retained.get();
            var row=editable(actor,id,expected);var original=revisions.read(row);var next=planning.refresh(row,original);var review=nextReview(row);
            reauthorize(actor,id,assignment);
            if(!next.equals(original) || !review.status().equals(row.getReviewStatus()))
                revisions.publish(row,next,row.getRunId(),"EXPERT",null,review.basis(),review.status(),actor.accountId());
            return retain(actor,"RULE_REFRESH",key,hash,rules.own(actor.organizationId(),row.getLearnerId(),id).orElseThrow());
        });
    }
}
