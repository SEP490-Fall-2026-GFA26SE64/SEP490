package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.time.Instant;
import java.util.*;

/** Own immutable requirement view with original per-option learning progress; proposals remain hidden until accepted. */
public final class RequirementPathwayView {
    public record ModuleOption(String moduleId,int moduleRevision,String contentVersion,String title,Instant startedAt,Instant completedAt) {}
    public record RequirementStep(UUID id,Requirement requirement,Kind kind,State state,String reason,UUID fulfilledEvidenceId,
            List<ModuleOption> options,CertificateReference certificate,boolean learningLocked) {}
    public record View(UUID requestId,UUID selectionId,long selectionRevision,String roleId,String roleName,String levelId,String levelName,
            String generationStatus,String reviewStatus,String reasonCode,Long revision,String contentHash,boolean archived,
            boolean targetReleased,List<RequirementStep> steps,List<Dependency> dependencies,PathwayTiming.View timing) {}
    private final Actors actors;private final RequirementPathwayJpaRepository rules;private final RequirementPathwayRevisions revisions;
    private final RequirementPathwayAdmissionService admission;private final RequirementPathwayAccess access;
    public RequirementPathwayView(Actors actors,RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            RequirementPathwayAdmissionService admission,RequirementPathwayAccess access) {
        this.actors=actors;this.rules=rules;this.revisions=revisions;this.admission=admission;this.access=access;
    }
    private Actor employee(){var actor=actors.require();actor.require(Role.EMPLOYEE);return actor;}
    public Optional<View> current() {
        var actor=employee();var rows=rules.current(actor.organizationId(),actor.accountId());
        if(rows.size()>1)throw new Failure(503,"CURRENT_PATHWAY_INTEGRITY_FAILURE");return rows.stream().findFirst().map(this::view);
    }
    public View own(UUID id) {
        var actor=employee();return view(rules.own(actor.organizationId(),actor.accountId(),id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND")));
    }
    private View view(RequirementPathwayJpaRepository.Row row) {
        var actor=employee();var binding=admission.decode(row).input().binding();var plan=revisions.read(row);
        var progress=rules.progress(actor.organizationId(),actor.accountId(),revisions.encode(plan));
        if(progress.size()>100000)throw new Failure(503,"PATHWAY_PROGRESS_QUERY_LIMIT");
        var byOption=new HashMap<String,RequirementPathwayJpaRepository.Progress>();
        progress.forEach(item->byOption.put(item.getStepId()+"\n"+item.getModuleId()+"\n"+item.getModuleRevision(),item));
        Set<UUID> acceptedIds;
        try{acceptedIds=access.acceptedSteps(row,plan);}
        catch(com.adaptlearngraph.exception.InitialPathwayFailure denied){if(denied.status()>=500)throw denied;acceptedIds=Set.of();}
        var visible=new ArrayList<RequirementStep>();
        for(var step:plan.steps()) {
            boolean accepted=acceptedIds.contains(step.id());
            var options=new ArrayList<ModuleOption>();boolean started=false;
            for(var option:step.options()) {
                var stored=byOption.get(step.id()+"\n"+option.moduleId()+"\n"+option.moduleRevision());
                boolean ongoing=stored!=null && stored.getStartedAt()!=null;started|=ongoing;
                if(accepted)options.add(new ModuleOption(option.moduleId(),option.moduleRevision(),option.contentVersion(),option.title(),
                        stored==null?null:stored.getStartedAt(),stored==null?null:stored.getCompletedAt()));
            }
            boolean gated=plan.dependencies().stream().filter(edge->edge.dependentStepId().equals(step.id()))
                    .map(edge->plan.steps().stream().filter(item->item.id().equals(edge.prerequisiteStepId())).findFirst().orElseThrow())
                    .anyMatch(prerequisite->prerequisite.state()!=State.FULFILLED && prerequisite.state()!=State.BYPASSED);
            var state=started && step.state()==State.NEEDS_SUPPLEMENTATION?State.IN_PROGRESS:step.state();
            visible.add(new RequirementStep(step.id(),step.requirement(),step.kind(),state,step.reason(),step.fulfilledEvidenceId(),List.copyOf(options),
                    accepted?step.certificate():null,!accepted || gated && !started));
        }
        if(!actor.equals(employee()))throw new Failure(403,"FORBIDDEN");
        return new View(row.getRequestId(),row.getSelectionId(),row.getSelectionRevision(),binding.roleId(),binding.roleName(),binding.levelId(),binding.levelName(),
                row.getGenerationStatus(),row.getReviewStatus(),row.getReasonCode(),row.getCurrentRevision(),row.getContentHash(),row.getArchivedAt()!=null,
                row.getCurrentRevision()!=null && plan.targetReleased() && ("APPROVED".equals(row.getReviewStatus()) || "NO_LEARNING_REQUIRED".equals(row.getGenerationStatus())),
                List.copyOf(visible),plan.dependencies(),revisions.timing(row));
    }
}
