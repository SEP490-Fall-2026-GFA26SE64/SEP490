package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.HttpsReference;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.time.Instant;
import java.util.*;
import org.springframework.core.io.InputStreamSource;

/** Own exact submissions only. File bytes stay in the existing private asset owner and never enter PG/Neo4j. */
public final class CertificateSubmissionService {
    public record Expected(long revision,String contentHash,UUID stepId) {}
    public record Submit(Expected expected,String link,UUID assetId,UUID replacesSubmissionId) {}
    public record AttachmentInfo(UUID assetId,String filename,String mediaType,long byteSize,String sha256) {}
    public record Frozen(UUID requestId,long pathwayRevision,UUID stepId,UUID selectionId,long selectionRevision,
            Requirement requirement,CertificateReference certificate,AttachmentInfo attachment) {}
    public record Decision(String decision,String reason,UUID expertId,Instant decidedAt) {}
    public record Submission(UUID id,UUID requestId,UUID stepId,UUID learnerId,long revision,String status,Requirement requirement,CertificateReference certificate,
            String evidenceKind,String link,String filename,String mediaType,Long byteSize,Instant submittedAt,UUID replacesSubmissionId,Decision decision,String learnerName) {}
    private record Context(RequirementPathwayJpaRepository.Row row,Step step) {}
    private final Actors actors;private final CurrentRoleSelectionStore selections;private final RequirementPathwayJpaRepository rules;
    private final RequirementPathwayRevisions revisions;private final RequirementPathwayAdmissionService admission;private final RequirementPathwayAccess access;
    private final RulePathwayCatalog catalog;private final CertificateSubmissionJpaRepository submissions;private final LearningContentPort content;
    private final LearningAssetPort files;private final Receipts receipts;private final com.fasterxml.jackson.databind.ObjectMapper json;
    public CertificateSubmissionService(Actors actors,CurrentRoleSelectionStore selections,RequirementPathwayJpaRepository rules,RequirementPathwayRevisions revisions,
            RequirementPathwayAdmissionService admission,RequirementPathwayAccess access,RulePathwayCatalog catalog,CertificateSubmissionJpaRepository submissions,
            LearningContentPort content,LearningAssetPort files,Receipts receipts,com.fasterxml.jackson.databind.ObjectMapper json) {
        this.actors=actors;this.selections=selections;this.rules=rules;this.revisions=revisions;this.admission=admission;this.access=access;
        this.catalog=catalog;this.submissions=submissions;this.content=content;this.files=files;this.receipts=receipts;this.json=json;
    }
    private Actor employee(){var actor=actors.require();actor.require(Role.EMPLOYEE);return actor;}
    private RoleBaselineFlow.Actor owner(Actor actor){return new RoleBaselineFlow.Actor(actor.organizationId(),actor.accountId());}
    private void same(Actor actor){if(!actor.equals(employee()))throw new Failure(403,"FORBIDDEN");}
    private Context context(Actor actor,UUID request,Expected expected) {
        if(expected==null || expected.revision()<1 || expected.stepId()==null || expected.contentHash()==null || !expected.contentHash().matches("[0-9a-f]{64}"))throw new Failure(400,"INVALID_REQUEST");
        var row=rules.own(actor.organizationId(),actor.accountId(),request).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        row=rules.lock(actor.organizationId(),request).orElseThrow();
        var selection=selections.current(owner(actor)).orElseThrow(()->new Failure(409,"SELECTION_REQUIRED"));
        if(row.getArchivedAt()!=null || !selection.selectionId().equals(row.getSelectionId()) || selection.revision()!=row.getSelectionRevision())throw new Failure(409,"TARGET_SELECTION_CHANGED");
        if(!Objects.equals(row.getCurrentRevision(),expected.revision()) || !expected.contentHash().equals(row.getContentHash()))throw new Failure(409,"STALE_PATHWAY_REVISION");
        var step=revisions.read(row).steps().stream().filter(item->item.id().equals(expected.stepId()) && item.requirement().provision()==Provision.CERTIFICATE_ONLY)
                .findFirst().orElseThrow(()->new Failure(404,"CERTIFICATE_REQUIREMENT_NOT_FOUND"));
        access.requireAccepted(row,step);
        if(step.state()==State.FULFILLED || !rules.official(actor.organizationId(),actor.accountId(),revisions.encode(List.of(step.requirement()))).isEmpty())throw new Failure(409,"REQUIREMENT_ALREADY_ACHIEVED");
        var input=admission.decode(row).input();var current=catalog.providers(owner(actor),input.roleSnapshot(),input.binding().levelId(),List.of(step.requirement()),Set.of(step.requirement().key()));
        var certificate=current.certificates().get(step.requirement().key());
        if(certificate==null || step.certificate()==null || !step.certificate().equals(new CertificateReference(certificate.id(),certificate.version(),certificate.name(),certificate.referenceUrl())))
            throw new Failure(409,"CERTIFICATE_PROVISION_CHANGED");
        return new Context(row,step);
    }
    private Optional<Receipt> replay(Actor actor,String operation,String key,String hash) {
        var found=receipts.find(actor,operation,"CERTIFICATE",key);if(found.isPresent() && !hash.equals(found.get().bodyHash()))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return found;
    }
    public Receipt upload(UUID request,String key,Expected expected,String filename,long size,String sha256,InputStreamSource source) {
        var actor=employee();InitialPathwayPorts.commandKey(key);
        if(filename==null || filename.isBlank() || filename.length()>255 || size<1 || size>10485760 || sha256==null || !sha256.matches("[0-9a-f]{64}"))throw new Failure(400,"INVALID_CERTIFICATE_UPLOAD");
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(request,expected,filename,size,sha256)));
        return selections.transaction(owner(actor),()->{
            same(actor);var retained=replay(actor,"CERTIFICATE_UPLOAD",key,hash);if(retained.isPresent())return retained.get();context(actor,request,expected);
            Asset asset;
            try(var input=source.getInputStream()){asset=files.uploadCertificate(actor.organizationId().toString(),actor.accountId().toString(),UUID.fromString(key),filename,size,input);}
            catch(java.io.IOException unavailable){throw new Failure(503,"PRIVATE_UPLOAD_UNAVAILABLE");}
            if(!sha256.equals(asset.sha256()))throw new Failure(400,"FILE_HASH_MISMATCH");
            same(actor);var receipt=new Receipt(201,hash,revisions.encode(Map.of("assetId",asset.id(),"filename",asset.filename(),"mediaType",asset.mediaType(),"byteSize",asset.byteSize(),"sha256",asset.sha256())));
            receipts.save(actor,"CERTIFICATE_UPLOAD","CERTIFICATE",key,receipt);return receipt;
        });
    }
    public Receipt submit(UUID request,String key,Submit command) {
        var actor=employee();InitialPathwayPorts.commandKey(key);if(command==null || (command.link()!=null)==(command.assetId()!=null))throw new Failure(400,"EXACTLY_ONE_CERTIFICATE_EVIDENCE_REQUIRED");
        String link=command.link()==null?null:HttpsReference.require(command.link()),hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(request,command)));
        return selections.transaction(owner(actor),()->{
            same(actor);var retained=replay(actor,"CERTIFICATE_SUBMIT",key,hash);if(retained.isPresent())return retained.get();var selected=context(actor,request,command.expected());var step=selected.step();
            if(submissions.pending(actor.organizationId(),actor.accountId(),request,step.id()))throw new Failure(409,"CERTIFICATE_REVIEW_PENDING");
            if(command.replacesSubmissionId()!=null) {
                var prior=submissions.own(actor.organizationId(),actor.accountId(),command.replacesSubmissionId()).orElseThrow(()->new Failure(404,"SUBMISSION_NOT_FOUND"));var frozen=decode(prior);
                if(!"REJECTED".equals(prior.getStatus()) || !request.equals(frozen.requestId()) || !step.id().equals(frozen.stepId()))throw new Failure(409,"REPLACEMENT_SUBMISSION_SCOPE_INVALID");
                var latest=submissions.history(actor.organizationId(),actor.accountId(),request,step.id(),0,1);
                if(latest.isEmpty() || !latest.getFirst().getId().equals(prior.getId()))throw new Failure(409,"STALE_SUBMISSION");
            } else if(!submissions.history(actor.organizationId(),actor.accountId(),request,step.id(),0,1).isEmpty())throw new Failure(409,"REPLACED_SUBMISSION_REQUIRED");
            Asset asset=null;
            if(command.assetId()!=null) {
                asset=content.asset(actor.organizationId().toString(),command.assetId().toString()).orElseThrow(()->new Failure(404,"PRIVATE_FILE_NOT_FOUND"));
                if(!asset.createdBy().equals(actor.accountId().toString()) || !asset.objectKey().startsWith(actor.organizationId()+"/certificate-evidence/")
                        || !Set.of("application/pdf","image/png","image/jpeg").contains(asset.mediaType()) || asset.byteSize()<1 || asset.byteSize()>10485760)
                    throw new Failure(404,"PRIVATE_FILE_NOT_FOUND");
                if(asset.mediaType().startsWith("image/") && asset.byteSize()>content.limits().imageBytes())throw new Failure(413,"FILE_EXCEEDS_CURRENT_UPLOAD_LIMIT");
            }
            var info=asset==null?null:new AttachmentInfo(UUID.fromString(asset.id()),asset.filename(),asset.mediaType(),asset.byteSize(),asset.sha256());
            var frozen=new Frozen(request,selected.row().getCurrentRevision(),step.id(),selected.row().getSelectionId(),selected.row().getSelectionRevision(),step.requirement(),step.certificate(),info);
            UUID id=UUID.randomUUID();submissions.submit(id,actor.organizationId(),actor.accountId(),step.requirement().skillId(),step.requirement().knowledgeLevel().name(),
                    step.certificate().id(),step.certificate().version(),revisions.encode(frozen),command.replacesSubmissionId());
            submissions.attachment(id,asset==null?"LINK":asset.mediaType().equals("application/pdf")?"PDF":"IMAGE",link,asset==null?null:asset.objectKey(),asset==null?null:asset.mediaType(),asset==null?null:asset.byteSize(),asset==null?null:asset.sha256());
            revisions.event(selected.row(),selected.row().getCurrentRevision(),"CERTIFICATE_EVIDENCE_SUBMITTED",actor.accountId(),Map.of("submissionId",id,"stepId",step.id()));
            var result=new Receipt(201,hash,revisions.encode(view(submissions.own(actor.organizationId(),actor.accountId(),id).orElseThrow())));
            receipts.save(actor,"CERTIFICATE_SUBMIT","CERTIFICATE",key,result);return result;
        });
    }
    public List<Submission> history(UUID request,UUID step,int offset,int limit) {
        var actor=employee();if(offset<0 || offset>10000 || limit<1 || limit>100)throw new Failure(400,"INVALID_PAGINATION");
        rules.own(actor.organizationId(),actor.accountId(),request).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
        var result=submissions.history(actor.organizationId(),actor.accountId(),request,step,offset,limit).stream().map(this::view).toList();same(actor);return result;
    }
    public Frozen decode(CertificateSubmissionJpaRepository.Row row) {
        try{var frozen=json.readValue(row.getDefinitionSnapshot(),Frozen.class);
            if(!row.getSkillId().equals(frozen.requirement().skillId()) || !row.getKnowledgeLevel().equals(frozen.requirement().knowledgeLevel().name())
                    || !row.getDefinitionId().equals(frozen.certificate().id()) || !row.getDefinitionVersion().equals(frozen.certificate().version()))throw new IllegalArgumentException();return frozen;
        }catch(Exception invalid){throw new Failure(503,"CERTIFICATE_SNAPSHOT_INTEGRITY_FAILURE");}
    }
    public Submission view(CertificateSubmissionJpaRepository.Row row) {
        var frozen=decode(row);return new Submission(row.getId(),frozen.requestId(),frozen.stepId(),row.getLearnerId(),row.getRevision(),row.getStatus(),frozen.requirement(),frozen.certificate(),
                row.getEvidenceKind(),row.getHttpsUrl(),frozen.attachment()==null?null:frozen.attachment().filename(),row.getMediaType(),row.getByteSize(),row.getSubmittedAt(),row.getReplacesSubmissionId(),
                row.getDecision()==null?null:new Decision(row.getDecision(),row.getReason(),row.getExpertId(),row.getDecidedAt()),row.getLearnerName());
    }
}
