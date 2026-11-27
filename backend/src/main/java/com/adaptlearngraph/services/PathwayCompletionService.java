package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.OrganizationMembershipJpaRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import java.util.*;

/** Local allowlisted convenience runner. Every write uses the ordinary learning/assessment lifecycle. */
@Service
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
public final class PathwayCompletionService {
    private final RoleBaselineFlow.Identity identity;
    private final OrganizationMembershipJpaRepository members;
    private final RequirementPathwayView pathways;
    private final LearningContentApplicationService content;
    private final RuleAssessmentAttemptService attempts;
    public PathwayCompletionService(RoleBaselineFlow.Identity identity,OrganizationMembershipJpaRepository members,
            RequirementPathwayView pathways,LearningContentApplicationService content,RuleAssessmentAttemptService attempts) {
        this.identity=identity;this.members=members;this.pathways=pathways;this.content=content;this.attempts=attempts;
    }
    private boolean allowed(RoleBaselineFlow.Actor actor){return members.autoFillEmployee(actor.organizationId(),actor.learnerId());}
    private void authorize(){if(!allowed(identity.requireEmployee()))throw new AssessmentPolicyService.Failure(403,"FORBIDDEN");}
    public record Progress(String phase,String detail) {}
    /** Bounded tick: retries discover saved progress; no completion flags, results or evidence are fabricated. */
    public Progress advance(UUID id) {
        authorize();
        var path=pathways.current().filter(p->p.requestId().equals(id) && !p.archived())
                .orElseThrow(()->new AssessmentPolicyService.Failure(409,"PATHWAY_NOT_CURRENT"));
        if(path.timing()!=null && "COMPLETED".equals(path.timing().state()))return ok("COMPLETED","");
        if(!"APPROVED".equals(path.reviewStatus()))throw new AssessmentPolicyService.Failure(409,"PATHWAY_NOT_APPROVED");
        var missing=path.steps().stream().filter(s->s.kind()==com.adaptlearngraph.entities.domain.RequirementPathway.Kind.REQUIRED
                && !Set.of("FULFILLED","ASSESSED_SATISFIED","BYPASSED").contains(s.state().name())).toList();
        if(missing.isEmpty())return ok("FINALIZING","");
        if(missing.stream().anyMatch(s->s.certificate()!=null && s.options().isEmpty()))
            throw new AssessmentPolicyService.Failure(409,"CERTIFICATE_APPROVAL_REQUIRED");
        for(var step:missing) {
            if(step.learningLocked() || step.assessmentLocked() || step.options().isEmpty())continue;
            var option=step.options().stream().filter(o->o.startedAt()!=null).findFirst().orElse(step.options().getFirst());
            var learning=content.view(option.moduleId(),true);
            if(learning.revision().number()!=option.moduleRevision())throw new AssessmentPolicyService.Failure(409,"MODULE_REVISION_CHANGED");
            for(var lesson:learning.revision().payload().content().lessons()) {
                if(learning.progress().stream().anyMatch(p->p.lessonId().equals(lesson.id()) && p.completedAt()!=null))continue;
                if(!"TEXT".equals(lesson.type()))throw new AssessmentPolicyService.Failure(409,"MANUAL_VIDEO_COMPLETION_REQUIRED");
                content.progress(option.moduleId(),lesson.id(),0,null,null,true,true,option.moduleRevision());
                return ok("COMPLETING_MODULES",option.title());
            }
            var command=new RuleAssessmentAttemptService.Start(com.adaptlearngraph.entities.domain.RuleAssessment.Purpose.SKILL_ASSESSMENT,
                    path.selectionId(),path.selectionRevision(),null,step.id(),option.moduleId(),option.moduleRevision());
            var attempt=attempts.latest(command);
            boolean sameContext=attempt!=null && Objects.equals(attempt.target().selectionId(),path.selectionId())
                    && attempt.target().selectionRevision()==path.selectionRevision() && Objects.equals(attempt.target().stepId(),step.id());
            if(attempt!=null && "IN_PROGRESS".equals(attempt.state()) && !sameContext)throw new AssessmentPolicyService.Failure(409,"ASSESSMENT_IN_PROGRESS");
            if(sameContext && "FINALIZED".equals(attempt.state()) && !attempt.results().isEmpty() && attempt.results().stream().allMatch(r->r.passed() && !r.vetoTriggered()))
                return ok("FINALIZING",step.requirement().skillName());
            if(attempt==null || !"IN_PROGRESS".equals(attempt.state())) {
                command=new RuleAssessmentAttemptService.Start(command.purpose(),command.expectedSelectionId(),command.expectedSelectionRevision(),
                        attempt==null?null:attempt.attemptId(),command.stepId(),command.moduleId(),command.moduleRevision());
                var key=UUID.nameUUIDFromBytes((id+":"+step.id()+":"+command.previousAttemptId()).getBytes(java.nio.charset.StandardCharsets.UTF_8));
                attempt=attempts.start(command,key);
            }
            var filled=attempts.completeAnswers(attempt.attemptId(),attempt.revision(),UUID.randomUUID(),this::allowed);
            attempts.submit(filled.attemptId(),filled.revision(),UUID.randomUUID());
            return ok("COMPLETING_ASSESSMENTS",step.requirement().skillName());
        }
        return ok("WAITING_FOR_REQUIREMENTS","");
    }
    private Progress ok(String phase,String detail){return new Progress(phase,detail);}
}
