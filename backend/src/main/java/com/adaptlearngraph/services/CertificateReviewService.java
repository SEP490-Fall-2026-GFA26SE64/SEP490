package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.io.InputStream;
import java.util.*;

/** Actual assigned Expert decisions and scoped private downloads. Original submitted definition/scope never follows later catalog edits. */
public final class CertificateReviewService {
    public record Decide(long expectedRevision,String decision,String reason) {}
    public record Download(String filename,String mediaType,long byteSize,java.util.function.Supplier<InputStream> open) {}
    private final Actors actors;private final ReviewAssignments assignments;private final CurrentRoleSelectionStore selections;
    private final CertificateSubmissionJpaRepository submissions;private final CertificateSubmissionService views;private final RequirementPathwayJpaRepository rules;
    private final RequirementPathwayRevisions revisions;private final LearningContentPort content;private final LearningAssetPort files;
    private final Receipts receipts;private final OutboxEventJpaRepository outbox;private final RuleAssessmentAttemptJpaRepository clock;
    private final RuleAssessmentOutcomeJpaRepository effects;
    private final AuditEventJpaRepository audit;
    public CertificateReviewService(Actors actors,ReviewAssignments assignments,CurrentRoleSelectionStore selections,CertificateSubmissionJpaRepository submissions,
            CertificateSubmissionService views,RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,LearningContentPort content,LearningAssetPort files,
            Receipts receipts,OutboxEventJpaRepository outbox,RuleAssessmentAttemptJpaRepository clock,RuleAssessmentOutcomeJpaRepository effects,AuditEventJpaRepository audit) {
        this.actors=actors;this.assignments=assignments;this.selections=selections;this.submissions=submissions;this.views=views;this.rules=rules;
        this.revisions=revisions;this.content=content;this.files=files;this.receipts=receipts;this.outbox=outbox;this.clock=clock;this.effects=effects;
        this.audit=audit;
    }
    private Actor expert(){var actor=actors.require();actor.require(Role.DOMAIN_EXPERT);return actor;}
    private void reauthorize(Actor actor,UUID request,Assignment assignment){if(!actor.equals(expert()) || !assignment.equals(assignments.require(actor,request)))throw new Failure(409,"REVIEW_ASSIGNMENT_CHANGED");}
    public List<CertificateSubmissionService.Submission> queue(int offset,int limit) {
        var actor=expert();if(offset<0 || offset>10000 || limit<1 || limit>100)throw new Failure(400,"INVALID_PAGINATION");
        var ids=assignments.assignedCertificatePathways(actor);if(ids.isEmpty())return List.of();
        var result=submissions.queue(actor.organizationId(),ids,offset,limit).stream().map(views::view).toList();
        if(!actor.equals(expert()))throw new Failure(403,"FORBIDDEN");return result;
    }
    public CertificateSubmissionService.Submission detail(UUID id) {
        var actor=expert();var row=submissions.inOrganization(actor.organizationId(),id).orElseThrow(()->new Failure(404,"SUBMISSION_NOT_FOUND"));
        var frozen=views.decode(row);var assignment=assignments.require(actor,frozen.requestId());var result=views.view(row);
        reauthorize(actor,frozen.requestId(),assignment);return result;
    }
    public Receipt decide(UUID id,String key,Decide command) {
        var actor=expert();InitialPathwayPorts.commandKey(key);UUID retry;
        try{retry=UUID.fromString(key);}catch(RuntimeException invalid){throw new Failure(400,"INVALID_IDEMPOTENCY_KEY");}
        if(command==null || command.expectedRevision()<1 || !Set.of("APPROVED","REJECTED").contains(Objects.toString(command.decision(),""))
                || command.reason()==null || command.reason().isBlank() || command.reason().length()>4000)throw new Failure(400,"DECISION_AND_REASON_REQUIRED");
        var source=submissions.inOrganization(actor.organizationId(),id).orElseThrow(()->new Failure(404,"SUBMISSION_NOT_FOUND"));
        var frozen=views.decode(source);var assignment=assignments.require(actor,frozen.requestId());
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(id,command)));
        return selections.transaction(new RoleBaselineFlow.Actor(actor.organizationId(),source.getLearnerId()),()->{
            reauthorize(actor,frozen.requestId(),assignment);
            var retained=receipts.find(actor,"CERTIFICATE_DECIDE","CERTIFICATE_REVIEW",key);
            if(retained.isPresent()){if(!hash.equals(retained.get().bodyHash()))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return retained.get();}
            submissions.lock(actor.organizationId(),source.getLearnerId(),id).orElseThrow(()->new Failure(404,"SUBMISSION_NOT_FOUND"));
            var row=submissions.inOrganization(actor.organizationId(),id).orElseThrow();
            if(row.getRevision()!=command.expectedRevision() || !"PENDING".equals(row.getStatus()))throw new Failure(409,"STALE_SUBMISSION");
            var request=rules.own(actor.organizationId(),row.getLearnerId(),frozen.requestId()).orElseThrow(()->new Failure(503,"SUBMISSION_PATHWAY_PROVENANCE_MISSING"));
            // Check the actual immutable submitted revision; a later catalog revision cannot silently change what was reviewed.
            var submitted=rules.submittedCertificate(actor.organizationId(),row.getLearnerId(),frozen.requestId(),frozen.pathwayRevision(),frozen.stepId(),
                    frozen.certificate().id(),frozen.certificate().version(),revisions.encode(frozen.requirement()));
            if(!submitted)throw new Failure(503,"SUBMISSION_PATHWAY_PROVENANCE_INVALID");
            reauthorize(actor,frozen.requestId(),assignment);
            if(submissions.decide(actor.organizationId(),row.getLearnerId(),id,row.getRevision(),command.decision())!=1)throw new Failure(409,"STALE_SUBMISSION");
            UUID decision=UUID.randomUUID();submissions.decision(decision,actor.organizationId(),id,row.getRevision(),command.decision(),actor.accountId(),revisions.encode(assignment),command.reason().trim(),retry);
            if("APPROVED".equals(command.decision())) {
                UUID evidence=UUID.randomUUID();var snapshot=new LinkedHashMap<String,Object>();
                snapshot.put("skillVersion",frozen.requirement().skillVersion());snapshot.put("skillName",frozen.requirement().skillName());snapshot.put("outcomeCodes",frozen.requirement().outcomeCodes());
                snapshot.put("requestId",frozen.requestId());snapshot.put("pathwayRevision",frozen.pathwayRevision());snapshot.put("stepId",frozen.stepId());
                snapshot.put("definitionId",frozen.certificate().id());snapshot.put("definitionVersion",frozen.certificate().version());snapshot.put("decisionId",decision);
                if(submissions.evidence(evidence,actor.organizationId(),row.getLearnerId(),id,revisions.encode(snapshot))!=1)throw new Failure(503,"CERTIFICATE_EVIDENCE_WRITE_INCOMPLETE");
                outbox.insert(new OutboxEventEntity(UUID.randomUUID(),"KNOWLEDGE_EVIDENCE_ACCEPTED",evidence,1,Map.of("organizationId",actor.organizationId(),"learnerId",row.getLearnerId(),"evidenceId",evidence,"sourceKind","CERTIFICATE"),id,clock.clock()));
                audit.insert(new com.adaptlearngraph.entities.AuditEventEntity(UUID.randomUUID(),actor.accountId(),"certificate","KNOWLEDGE_EVIDENCE_ACCEPTED",evidence,"1",clock.clock(),"ACCEPTED",id));
                effects.resolveReviews(actor.organizationId(),row.getLearnerId(),evidence);
            }
            revisions.event(request,frozen.pathwayRevision(),"CERTIFICATE_"+command.decision(),actor.accountId(),Map.of("submissionId",id,"decisionId",decision,"reason",command.reason().trim()));
            var result=new Receipt(200,hash,revisions.encode(views.view(submissions.inOrganization(actor.organizationId(),id).orElseThrow())));
            receipts.save(actor,"CERTIFICATE_DECIDE","CERTIFICATE_REVIEW",key,result);return result;
        });
    }
    public Download file(UUID id) {
        var actor=actors.require();var row=submissions.inOrganization(actor.organizationId(),id).orElseThrow(()->new Failure(404,"SUBMISSION_NOT_FOUND"));
        var frozen=views.decode(row);Assignment assignment;
        if(actor.role()==Role.EMPLOYEE) {if(!actor.accountId().equals(row.getLearnerId()))throw new Failure(404,"SUBMISSION_NOT_FOUND");assignment=null;}
        else {actor.require(Role.DOMAIN_EXPERT);assignment=assignments.require(actor,frozen.requestId());}
        if(frozen.attachment()==null)throw new Failure(404,"SUBMISSION_FILE_NOT_FOUND");
        Asset asset=content.asset(actor.organizationId().toString(),frozen.attachment().assetId().toString()).orElseThrow(()->new Failure(404,"SUBMISSION_FILE_NOT_FOUND"));
        if(!asset.createdBy().equals(row.getLearnerId().toString()) || !asset.objectKey().equals(row.getPrivateObjectKey())
                || !asset.sha256().equals(row.getContentHash()) || asset.byteSize()!=row.getByteSize() || !asset.mediaType().equals(row.getMediaType()))throw new Failure(503,"PRIVATE_EVIDENCE_INTEGRITY_FAILURE");
        return new Download(asset.filename(),asset.mediaType(),asset.byteSize(),()->{
            if(!actor.equals(actors.require()))throw new Failure(403,"FORBIDDEN");
            if(assignment!=null)reauthorize(actor,frozen.requestId(),assignment);
            return files.open(asset,0,asset.byteSize());
        });
    }
}
