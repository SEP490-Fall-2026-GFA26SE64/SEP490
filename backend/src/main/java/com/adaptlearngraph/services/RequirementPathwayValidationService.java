package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import java.util.*;

/** Fresh scoped validation of an immutable proposal. Parallel shortcomings remain visible without becoming target gates. */
public final class RequirementPathwayValidationService {
    public record Issue(UUID stepId,String reason,boolean blocking) {}
    public record Checked(long revision,String contentHash,boolean valid,List<Issue> issues) {public Checked {issues=List.copyOf(issues);}}
    private record Origin(Requirement requirement,Kind kind,UUID sourceBypassId,AssessedSource source) {}
    private final RequirementPathwayAdmissionService admission;private final RequirementPathwayRevisions revisions;
    private final RequirementPathwayJpaRepository rules;private final RulePathwayCatalog catalog;
    public RequirementPathwayValidationService(RequirementPathwayAdmissionService admission,RequirementPathwayRevisions revisions,RequirementPathwayJpaRepository rules,RulePathwayCatalog catalog) {
        this.admission=admission;this.revisions=revisions;this.rules=rules;this.catalog=catalog;
    }
    public RulePathwayCatalog.Snapshot providers(RequirementPathwayJpaRepository.Row row,Plan plan) {
        var input=admission.decode(row).input();var needs=new ArrayList<Requirement>();var strict=new HashSet<String>();
        for(var step:plan.steps())if(step.state()!=State.FULFILLED && step.state()!=State.BYPASSED) {
            needs.add(step.requirement());if(step.kind()==Kind.REQUIRED)strict.add(step.requirement().key());
        }
        return catalog.providers(new RoleBaselineFlow.Actor(row.getOrganizationId(),row.getLearnerId()),input.roleSnapshot(),input.binding().levelId(),needs,strict);
    }
    public Checked check(RequirementPathwayJpaRepository.Row row) {
        if(row.getCurrentRevision()==null)return new Checked(0,null,false,List.of(new Issue(null,"GENERATION_NOT_FINISHED",true)));
        return check(row,revisions.read(row));
    }
    public Checked check(RequirementPathwayJpaRepository.Row row,Plan plan) {
        var input=admission.decode(row).input();var issues=new ArrayList<Issue>();
        var initial=new HashMap<String,Requirement>();input.required().forEach(requirement->initial.put(requirement.key(),requirement));
        var byId=new HashMap<UUID,Step>();plan.steps().forEach(step->byId.put(step.id(),step));
        for(var requirement:input.required())if(plan.steps().stream().noneMatch(step->step.kind()==Kind.REQUIRED && step.requirement().key().equals(requirement.key())))
            issues.add(new Issue(null,"REQUIRED_STEP_MISSING",true));
        var carried=new HashMap<String,Requirement>();input.parallel().forEach(item->carried.put(item.bypassId()+"\n"+item.requirement().key(),item.requirement()));
        var sources=new LinkedHashSet<Origin>();
        for(var step:plan.steps()) {
            var original=step.kind()==Kind.REQUIRED?initial.get(step.requirement().key()):carried.get(step.sourceBypassId()+"\n"+step.requirement().key());
            boolean established=original!=null && original.key().equals(step.requirement().key());
            if(established && original.provision()!=Provision.UNCONFIGURED && !original.proofKey().equals(step.requirement().proofKey()))
                issues.add(new Issue(step.id(),"PINNED_REQUIREMENT_SCOPE_CHANGED",step.kind()==Kind.REQUIRED));
            if(!established && step.assessedSources().isEmpty())issues.add(new Issue(step.id(),"ASSESSED_SUPPLEMENT_SOURCE_REQUIRED",true));
            for(var source:step.assessedSources()) {
                var parent=byId.get(source.dependentStepId());
                boolean historical=step.kind()==Kind.PARALLEL_SUPPLEMENT && source.requestId()!=null && !source.requestId().equals(row.getRequestId());
                if(!historical && (parent==null || parent.kind()!=step.kind() || !Objects.equals(parent.sourceBypassId(),step.sourceBypassId())))
                    issues.add(new Issue(step.id(),"SUPPLEMENT_SOURCE_SCOPE_INVALID",true));
                sources.add(new Origin(step.requirement(),step.kind(),step.sourceBypassId(),source));
            }
        }
        for(var dependency:plan.dependencies()) {
            var prerequisite=byId.get(dependency.prerequisiteStepId());
            sources.add(new Origin(prerequisite.requirement(),prerequisite.kind(),prerequisite.sourceBypassId(),
                    new AssessedSource(dependency.attemptId(),dependency.groupId(),dependency.dependentStepId())));
        }
        if(!sources.isEmpty() && rules.validSources(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),revisions.encode(sources))!=sources.size())
            issues.add(new Issue(null,"ASSESSED_SUPPLEMENT_SOURCE_INVALID",true));
        long fulfilled=plan.steps().stream().filter(step->step.state()==State.FULFILLED).count();
        if(fulfilled>0 && rules.validFulfilled(row.getOrganizationId(),row.getLearnerId(),revisions.encode(plan))!=fulfilled)
            issues.add(new Issue(null,"OFFICIAL_COMPLETION_PROVENANCE_INVALID",true));
        var bypasses=new HashSet<UUID>();rules.bypasses(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),row.getCurrentRevision()).forEach(bypass->bypasses.add(bypass.getStepId()));
        for(var step:plan.steps())if(step.state()==State.BYPASSED && !bypasses.contains(step.id()))issues.add(new Issue(step.id(),"SCOPED_BYPASS_REQUIRED",true));
        RulePathwayCatalog.Snapshot fresh=null;
        try{fresh=providers(row,plan);}
        catch(com.adaptlearngraph.exception.InitialPathwayFailure unavailable) {
            issues.add(new Issue(null,unavailable.code(),plan.steps().stream().anyMatch(step->step.kind()==Kind.REQUIRED && step.state()!=State.FULFILLED && step.state()!=State.BYPASSED)));
        }
        if(fresh!=null)for(var step:plan.steps())if(step.state()!=State.FULFILLED && step.state()!=State.BYPASSED) {
            boolean blocking=step.kind()==Kind.REQUIRED;
            var current=fresh.requirements().stream().filter(requirement->requirement.key().equals(step.requirement().key())).findFirst();
            if(current.isEmpty() || !current.get().proofKey().equals(step.requirement().proofKey()) || current.get().provision()!=step.requirement().provision()) {
                issues.add(new Issue(step.id(),"CURRENT_REQUIREMENT_SCOPE_CHANGED",blocking));continue;
            }
            if(step.state()==State.NEEDS_EXPERT_ACTION || step.requirement().provision()==Provision.UNCONFIGURED)
                issues.add(new Issue(step.id(),"PROVISION_REQUIRES_EXPERT_ACTION",blocking));
            if(step.requirement().provision()==Provision.MODULE_ONLY && (step.options().isEmpty()
                    || !new HashSet<>(fresh.options().getOrDefault(step.requirement().key(),List.of())).containsAll(step.options())))
                issues.add(new Issue(step.id(),"MODULE_OPTIONS_CHANGED",blocking));
            if(step.requirement().provision()==Provision.CERTIFICATE_ONLY) {
                var certificate=fresh.certificates().get(step.requirement().key());
                if(certificate==null || step.certificate()==null || !step.certificate().equals(new CertificateReference(certificate.id(),certificate.version(),certificate.name(),certificate.referenceUrl())))
                    issues.add(new Issue(step.id(),"CERTIFICATE_PROVISION_CHANGED",blocking));
            }
        }
        return new Checked(row.getCurrentRevision(),row.getContentHash(),issues.stream().noneMatch(Issue::blocking),issues);
    }
}
