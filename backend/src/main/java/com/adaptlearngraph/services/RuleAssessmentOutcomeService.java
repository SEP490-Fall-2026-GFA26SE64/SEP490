package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.entities.domain.RuleAssessmentDecision;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Bounded PostgreSQL-only effects. Queue ownership comes from the persisted attempt, never an event/client tenant field. */
public final class RuleAssessmentOutcomeService {
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(RuleAssessmentOutcomeService.class);
    private final RuleAssessmentOutcomeJpaRepository effects;
    private final RuleAssessmentAttemptJpaRepository attempts;
    private final CurrentRoleSelectionStore selections;
    private final OutboxEventJpaRepository outbox;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    @FunctionalInterface public interface PathwayEffects {void apply(RuleAssessmentAttemptEntity attempt,UUID event,List<RuleAssessmentOutcomeJpaRepository.GroupRow> groups);}
    private final PathwayEffects pathways;
    private final AuditEventJpaRepository audit;
    public RuleAssessmentOutcomeService(RuleAssessmentOutcomeJpaRepository effects,RuleAssessmentAttemptJpaRepository attempts,
            CurrentRoleSelectionStore selections,OutboxEventJpaRepository outbox,TransactionTemplate tx,ObjectMapper json,PathwayEffects pathways,AuditEventJpaRepository audit) {
        this.effects=effects;this.attempts=attempts;this.selections=selections;this.outbox=outbox;this.tx=tx;this.json=json;
        this.pathways=pathways;
        this.audit=audit;
    }
    public void runBatch() {
        for(int i=0;i<10;i++) {
            var failedJob=new UUID[1];
            try {
                boolean found=Boolean.TRUE.equals(tx.execute(status->{
                    var work=effects.lockNext();if(work.isEmpty())return false;
                    var owned=work.get();failedJob[0]=owned.getJobId();
                    return selections.transaction(new RoleBaselineFlow.Actor(owned.getOrganizationId(),owned.getLearnerId()),()->{apply(owned);return true;});
                }));
                if(!found)return;
            }catch(RuntimeException failure) {
                LOG.warn("Rule result job {} needs retry ({})",failedJob[0],failure.getClass().getSimpleName());
                if(failedJob[0]!=null)try{tx.executeWithoutResult(status->effects.retry(failedJob[0],"RESULT_PROCESSING_RETRY_REQUIRED"));}
                catch(RuntimeException unavailable){LOG.warn("Unable to retain retry for rule result job {}",failedJob[0]);}
            }
        }
    }
    private void apply(RuleAssessmentOutcomeJpaRepository.Work work) {
        var a=attempts.lock(work.getOrganizationId(),work.getLearnerId(),work.getAttemptId()).orElseThrow(RuleAssessmentOutcomeService::integrity);
        if(!"FINALIZED".equals(a.getState()) || work.getSourceRevision()>a.getRevision())throw integrity();
        var frozen=read(a.getContextSnapshot());var context=frozen.path("context");
        var definitions=new HashMap<String,JsonNode>();
        for(var definition:context.path("requirements")) {
            var requirement=json.convertValue(definition.path("requirement"),Requirement.class);
            if(definitions.put(requirement.key(),definition)!=null)throw integrity();
        }
        var rows=effects.groups(a.getOrganizationId(),a.getLearnerId(),a.getId());
        if(rows.isEmpty() || rows.size()>1000 || rows.size()!=frozen.path("groupCount").asInt(-1))throw integrity();
        var results=new ArrayList<GroupResult>();var officialNow=new HashSet<String>();var officialAtFinish=new HashSet<String>();
        for(var row:rows) {
            var requirement=new Requirement(row.getSkillId(),KnowledgeLevel.valueOf(row.getKnowledgeLevel()),strings(row.getOutcomeCodes()));
            var definition=definitions.get(requirement.key());
            if(definition==null || !requirement.equals(json.convertValue(definition.path("requirement"),Requirement.class))
                    || definition.path("skillVersion").asText().isBlank())throw integrity();
            results.add(new GroupResult(row.getGroupId(),requirement,GroupRole.valueOf(row.getRole()),row.getCorrectCount(),row.getTotalCount(),
                    row.getMandatorySatisfied(),row.getPassed(),row.getVetoTriggered(),strings(row.getReasons())));
            if(row.getRole().equals("PREREQUISITE")) {
                if(row.getOfficialNow())officialNow.add(requirement.key());
                if(row.getOfficialAtFinalization())officialAtFinish.add(requirement.key());
            }
        }
        pathways.apply(a,work.getEventId(),rows);
        boolean assignedLearningPending="SKILL_ASSESSMENT".equals(a.getPurpose()) && effects.assignedLearningPending(a.getOrganizationId(),a.getLearnerId(),a.getId());
        var decision=RuleAssessmentDecision.decide(Purpose.valueOf(a.getPurpose()),results,officialAtFinish,officialNow,assignedLearningPending);
        for(var review:decision.reviews()) {
            UUID id=UUID.randomUUID();
            if(effects.review(id,a.getOrganizationId(),a.getLearnerId(),review.requirement().skillId(),review.requirement().knowledgeLevel().name(),a.getId(),review.groupId())==1) {
                var now=attempts.clock();
                outbox.insert(new OutboxEventEntity(UUID.randomUUID(),"SKILL_KNOWLEDGE_NEED_REVIEW",id,1,
                        Map.of("organizationId",a.getOrganizationId(),"learnerId",a.getLearnerId(),"attemptId",a.getId(),"groupId",review.groupId()),a.getId(),now));
                audit.insert(new com.adaptlearngraph.entities.AuditEventEntity(UUID.randomUUID(),null,"rule-assessment","SKILL_KNOWLEDGE_NEED_REVIEW",id,"1",now,"ACCEPTED",a.getId()));
            }
        }
        // A later genuine evidence source resolves an earlier review; the evidence itself is never removed.
        effects.resolveCompatibleReviews(a.getOrganizationId(),a.getLearnerId());
        if(decision.state()==RuleAssessmentDecision.State.READY) {
            var evidenceEvent=award(a,work,context,definitions.get(decision.main().requirement().key()),decision.main());
            // The first recalculation discovers mandatory supplements before the decision.
            // Reconcile again with the real accepted evidence in this same transaction,
            // rather than leaving the current step yellow until the periodic refresh.
            if(evidenceEvent!=null)pathways.apply(a,evidenceEvent,rows);
        }
        if(decision.state()==RuleAssessmentDecision.State.WAITING_SUPPLEMENT) {
            effects.retry(work.getJobId(),"WAITING_REQUIRED_SUPPLEMENT");return;
        }
        if(effects.processed(a.getOrganizationId(),a.getLearnerId(),a.getId())!=1 || effects.done(work.getJobId())!=1)throw integrity();
        effects.receipt(work.getEventId(),work.getSourceRevision());
    }
    private UUID award(RuleAssessmentAttemptEntity attempt,RuleAssessmentOutcomeJpaRepository.Work work,JsonNode context,JsonNode definition,GroupResult main) {
        var requirement=main.requirement();
        var snapshot=new LinkedHashMap<String,Object>();
        snapshot.put("skillVersion",definition.get("skillVersion").asText());snapshot.put("skillName",definition.get("skillName").asText());
        snapshot.put("attemptId",attempt.getId());snapshot.put("groupId",main.groupId());
        for(var field:List.of("selectionId","selectionRevision","requestId","pathwayRevision","stepId","moduleId","moduleRevision","contentVersion")) {
            if(context.path(field).isMissingNode() || context.path(field).isNull())throw integrity();snapshot.put(field,json.convertValue(context.get(field),Object.class));
        }
        snapshot.put("policyId",attempt.getPolicyId());snapshot.put("policyHash",attempt.getPolicyHash());
        snapshot.put("assessmentFinishedAt",attempt.getFinishedAt());
        int inserted=effects.evidence(UUID.randomUUID(),attempt.getOrganizationId(),attempt.getLearnerId(),attempt.getId(),work.getSourceRevision(),
                requirement.skillId(),requirement.knowledgeLevel().name(),write(snapshot),UUID.fromString(context.get("requestId").asText()),
                context.get("pathwayRevision").asLong(),UUID.fromString(context.get("stepId").asText()),context.get("moduleId").asText(),
                context.get("moduleRevision").asInt(),context.get("contentVersion").asText());
        UUID id=effects.evidenceId(attempt.getOrganizationId(),attempt.getLearnerId(),attempt.getId(),work.getSourceRevision(),requirement.skillId(),requirement.knowledgeLevel().name())
                .orElseThrow(()->new IllegalStateException("Retained qualifying module completion is unavailable"));
        effects.resolveReviews(attempt.getOrganizationId(),attempt.getLearnerId(),id);
        UUID event=null;
        if(inserted==1) {
            event=UUID.randomUUID();
            var now=attempts.clock();
            outbox.insert(new OutboxEventEntity(event,"KNOWLEDGE_EVIDENCE_ACCEPTED",id,1,
                    Map.of("organizationId",attempt.getOrganizationId(),"learnerId",attempt.getLearnerId(),"evidenceId",id,"sourceKind","MODULE_ASSESSMENT"),attempt.getId(),now));
            audit.insert(new com.adaptlearngraph.entities.AuditEventEntity(UUID.randomUUID(),null,"rule-assessment","KNOWLEDGE_EVIDENCE_ACCEPTED",id,"1",now,"ACCEPTED",attempt.getId()));
        }
        return event;
    }
    private JsonNode read(String value){try{return json.readTree(value);}catch(Exception invalid){throw integrity();}}
    private List<String> strings(String value){try{return json.readValue(value,new TypeReference<List<String>>(){});}catch(Exception invalid){throw integrity();}}
    private String write(Object value){try{return json.writeValueAsString(value);}catch(Exception invalid){throw integrity();}}
    private static IllegalStateException integrity(){return new IllegalStateException("Rule result provenance is inconsistent");}
}
