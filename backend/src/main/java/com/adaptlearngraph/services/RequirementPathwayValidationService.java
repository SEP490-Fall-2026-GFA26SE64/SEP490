package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import java.util.*;

/** Fresh scoped validation of an immutable proposal. Parallel shortcomings remain visible without becoming target gates. */
public final class RequirementPathwayValidationService {
    public record Issue(UUID stepId,String reason,boolean blocking,
                        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) String moduleId,
                        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) Integer moduleRevision) {
        public Issue(UUID stepId,String reason,boolean blocking){this(stepId,reason,blocking,null,null);}
    }
    public record Checked(long revision,String contentHash,boolean valid,List<Issue> issues) {public Checked {issues=List.copyOf(issues);}}
    private record Origin(Requirement requirement,Kind kind,UUID sourceBypassId,AssessedSource source) {}
    private final RequirementPathwayAdmissionService admission;private final RequirementPathwayRevisions revisions;
    private final RequirementPathwayJpaRepository rules;private final RulePathwayCatalog catalog;
    public RequirementPathwayValidationService(RequirementPathwayAdmissionService admission,RequirementPathwayRevisions revisions,RequirementPathwayJpaRepository rules,RulePathwayCatalog catalog) {
        this.admission=admission;this.revisions=revisions;this.rules=rules;this.catalog=catalog;
    }
    public RulePathwayCatalog.Snapshot providers(RequirementPathwayJpaRepository.Row row,Plan plan) {
        var input=admission.decode(row).input();var needs=new ArrayList<Requirement>();var strict=new HashSet<String>();
        for(var step:plan.steps())if(!step.resolved()) {
            needs.add(step.requirement());if(step.kind()==Kind.REQUIRED)strict.add(step.requirement().key());
        }
        return catalog.retainCertificates(row.getOrganizationId(),catalog.providers(new RoleBaselineFlow.Actor(row.getOrganizationId(),row.getLearnerId()),input.roleSnapshot(),input.binding().levelId(),needs,strict),input.catalog(),plan);
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
        var retained=rules.carried(row.getOrganizationId(),row.getLearnerId());
        if(retained.size()>1000)throw new InitialPathwayPorts.Failure(503,"BYPASS_HISTORY_LIMIT");
        for(var gap:retained) {
            // The bypass belongs to this tenant/learner and an immutable approved pathway.
            var need=revisions.requirement(gap.getRequirementSnapshot());
            carried.put(gap.getBypassId()+"\n"+need.key(),need);
        }
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
            var source=prerequisite.assessedSources().stream().filter(item->item.attemptId().equals(dependency.attemptId()) && item.groupId().equals(dependency.groupId()))
                    .findFirst().orElse(new AssessedSource(dependency.attemptId(),dependency.groupId(),dependency.dependentStepId()));
            if(!source.dependentStepId().equals(dependency.dependentStepId())) {
                var parent=byId.get(source.dependentStepId());var dependent=byId.get(dependency.dependentStepId());
                boolean foundation=parent!=null && dependent.requirement().skillId().equals(parent.requirement().skillId())
                        && dependent.requirement().knowledgeLevel().ordinal()<parent.requirement().knowledgeLevel().ordinal()
                        && dependent.assessedSources().stream().anyMatch(item->item.dependentStepId().equals(parent.id()));
                boolean earlier=parent!=null && (!prerequisite.requirement().skillId().equals(parent.requirement().skillId())
                        || prerequisite.requirement().knowledgeLevel().ordinal()<dependent.requirement().knowledgeLevel().ordinal());
                if(!foundation || !earlier)issues.add(new Issue(dependent.id(),"SUPPLEMENT_SOURCE_SCOPE_INVALID",true));
            }
            sources.add(new Origin(prerequisite.requirement(),prerequisite.kind(),prerequisite.sourceBypassId(),
                    source));
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
            issues.add(new Issue(null,unavailable.code(),plan.steps().stream().anyMatch(step->step.kind()==Kind.REQUIRED && !step.resolved())));
        }
        if(fresh!=null)for(var step:plan.steps())if(!step.resolved()) {
            boolean blocking=step.kind()==Kind.REQUIRED;
            var current=fresh.requirements().stream().filter(requirement->requirement.key().equals(step.requirement().key())).findFirst();
            if(current.isEmpty() || !current.get().proofKey().equals(step.requirement().proofKey()) || current.get().provision()!=step.requirement().provision()) {
                issues.add(new Issue(step.id(),"CURRENT_REQUIREMENT_SCOPE_CHANGED",blocking));continue;
            }
            if(step.state()==State.NEEDS_EXPERT_ACTION || step.requirement().provision()==Provision.UNCONFIGURED)
                issues.add(new Issue(step.id(),"PROVISION_REQUIRES_EXPERT_ACTION",blocking));
            if(step.requirement().provision()==Provision.MODULE_ONLY) {
                if(step.options().isEmpty())issues.add(new Issue(step.id(),"MODULE_OPTIONS_CHANGED",blocking));
                var eligible=new HashSet<>(fresh.options().getOrDefault(step.requirement().key(),List.of()));
                for(var option:step.options())if(!eligible.contains(option))
                    issues.add(new Issue(step.id(),"MODULE_OPTIONS_CHANGED",blocking,option.moduleId(),option.moduleRevision()));
            }
            if(step.requirement().provision()==Provision.CERTIFICATE_ONLY) {
                var certificate=fresh.certificates().get(step.requirement().key());
                if(certificate==null || step.certificate()==null || !step.certificate().sameDefinition(new CertificateReference(certificate.id(),certificate.version(),certificate.name(),certificate.referenceUrl(),certificate.description())))
                    issues.add(new Issue(step.id(),"CERTIFICATE_PROVISION_CHANGED",blocking));
            }
        }
        return new Checked(row.getCurrentRevision(),row.getContentHash(),issues.stream().noneMatch(Issue::blocking),issues);
    }
}
