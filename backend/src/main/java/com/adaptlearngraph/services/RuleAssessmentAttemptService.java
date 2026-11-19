package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.RuleAssessmentAttemptEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.SkillAssessmentScope;
import com.adaptlearngraph.entities.domain.RuleAssessment;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/** One shared persisted paper lifecycle for both separately configured purposes. */
public final class RuleAssessmentAttemptService {
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(RuleAssessmentAttemptService.class);
    public record Start(Purpose purpose,UUID expectedSelectionId,long expectedSelectionRevision,
                        UUID previousAttemptId,UUID stepId,String moduleId,Integer moduleRevision) {
        public boolean independent() {return purpose==Purpose.SKILL_ASSESSMENT && expectedSelectionId==null && expectedSelectionRevision==0 && stepId==null && moduleId!=null && !moduleId.isBlank() && moduleRevision!=null && moduleRevision>0;}
        public boolean validContext() {return independent() || expectedSelectionId!=null && expectedSelectionRevision>0;}
    }
    public record Answer(long expectedRevision,int position,UUID itemVersionId,String selectedOptionId) {}
    public record Need(Requirement requirement,GroupRole role) {}
    public record Context(UUID selectionId,long selectionRevision,String contextKey,String snapshot,List<Need> groups) {
        public Context { groups=List.copyOf(groups); }
    }
    public interface Contexts {
        Context resolve(RoleBaselineFlow.Actor actor,Start command);
        void assertCurrent(RoleBaselineFlow.Actor actor,Context context);
        default void assertAccessible(RoleBaselineFlow.Actor actor,String frozenContext) {}
        default String admissionIssue(RoleBaselineFlow.Actor actor,SkillAssessmentScope scope){return null;}
        default SkillAssessmentScope scopeForModule(RoleBaselineFlow.Actor actor,String moduleId,int revision) { throw new Failure(503,"SKILL_SCOPE_UNAVAILABLE"); }
    }
    public record Question(int position,UUID itemVersionId,UUID groupId,String prompt,List<Option> options,String selectedOptionId,boolean mandatory) {}
    public record GroupView(UUID id,String skillName,Requirement requirement,GroupRole role,int totalCount,int requiredCorrectCount,boolean mandatoryRequired) {}
    public record Target(UUID selectionId,long selectionRevision,String roleId,String roleName,String levelId,String levelName,
                         String jobPositionId,String jobPositionName,UUID stepId,String moduleId,Integer moduleRevision) {}
    public record View(UUID attemptId,Purpose purpose,Target target,String state,long revision,Instant startedAt,Instant deadlineAt,Instant observedAt,
                       Instant finishedAt,String finishReason,UUID previousAttemptId,List<GroupView> groups,List<Question> questions,List<GroupResult> results) {}
    public record AttemptSummary(UUID attemptId,Target target,String state,Instant startedAt,Instant deadlineAt,Instant finishedAt,String finishReason,UUID previousAttemptId) {}
    public record SkillHistory(SkillAssessmentScope scope,List<AttemptSummary> items,List<AttemptSummary> activeAttempts,
            long totalAttempts,long unresolvedAttempts,int page,int pageSize,boolean hasMore,UUID previousAttemptId,
            Integer maxAttempts,Instant retakeAvailableAt,String policyIssue,Instant observedAt) {}
    private final RoleBaselineFlow.Identity identity;
    private final CurrentRoleSelectionStore selections;
    private final Contexts contexts;
    private final RuleAssessmentAttemptJpaRepository attempts;
    private final AssessmentRulePolicyJpaRepository policies;
    private final ScopedAssessmentPolicyJpaRepository scopedPolicies;
    private final AssessmentPolicyCatalog policyCatalog;
    private final AssessmentItemKnowledgeMappingJpaRepository bank;
    private final OutboxEventJpaRepository outbox;
    private final ProcessingJobJpaRepository jobs;
    private final PostgresAdvisoryLocks locks;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    private final int maximum;
    private final AuditEventJpaRepository audit;
    public RuleAssessmentAttemptService(RoleBaselineFlow.Identity identity,CurrentRoleSelectionStore selections,Contexts contexts,
            RuleAssessmentAttemptJpaRepository attempts,AssessmentRulePolicyJpaRepository policies,ScopedAssessmentPolicyJpaRepository scopedPolicies,AssessmentPolicyCatalog policyCatalog,
            AssessmentItemKnowledgeMappingJpaRepository bank,OutboxEventJpaRepository outbox,ProcessingJobJpaRepository jobs,PostgresAdvisoryLocks locks,
            TransactionTemplate tx,ObjectMapper json,int maximum,AuditEventJpaRepository audit) {
        if(maximum<1 || maximum>10000)throw new IllegalArgumentException("Invalid paper capacity");
        this.identity=identity;this.selections=selections;this.contexts=contexts;this.attempts=attempts;
        this.scopedPolicies=scopedPolicies;this.policyCatalog=policyCatalog;
        this.policies=policies;this.bank=bank;this.outbox=outbox;this.jobs=jobs;this.locks=locks;this.tx=tx;this.json=json;this.maximum=maximum;
        this.audit=audit;
    }
    private RoleBaselineFlow.Actor actor() {
        return identity.requireEmployee();
    }
    public View latestHttp(String purpose,UUID selectionId,long selectionRevision,UUID stepId,String moduleId,Integer moduleRevision) {
        return latest(new Start(Purpose.valueOf(purpose),selectionId,selectionRevision,null,stepId,moduleId,moduleRevision));
    }
    public void authorize(){actor();}
    private void reauthorize(RoleBaselineFlow.Actor a){if(!a.equals(actor()))throw new Failure(403,"FORBIDDEN");}
    public View latest(Start command) {
        var a=actor();if(command==null || command.purpose()==null || !command.validContext())throw new Failure(400,"INVALID_REQUEST");
        var context=contexts.resolve(a,command);
        var id=selections.transaction(a,()->{
            reauthorize(a);contexts.assertCurrent(a,context);
            if(command.purpose()==Purpose.SKILL_ASSESSMENT) {
                var scope=skillScope(context);ensureResolved(a,scope);
                var active=activeSkill(a,scope,true);
                if(active.size()>1)throw new Failure(409,"MULTIPLE_ACTIVE_SKILL_ASSESSMENTS");
                return active.isEmpty()?latestSkill(a,scope).map(RuleAssessmentAttemptEntity::getId):Optional.of(active.getFirst().getId());
            }
            return attempts.contextHistory(a.organizationId(),a.learnerId(),command.purpose().name(),context.contextKey(),PageRequest.of(0,1)).stream()
                    .map(RuleAssessmentAttemptEntity::getId).findFirst();
        });
        return id.map(this::resume).orElse(null);
    }
    public View start(Start command,UUID key) {
        var a=actor();if(command==null || command.purpose()==null || key==null || !command.validContext())throw new Failure(400,"INVALID_REQUEST");
        String resource="ASSESSMENT_START",hash=RoleBaselineFlow.hash(write(command));
        // Replays hash the client command, never a newly changed catalog/policy/evidence snapshot.
        var retained=selections.transaction(a,()->{reauthorize(a);return receipt(a,"RULE_START",resource,key,hash);});
        if(retained.isPresent())return retained.get();
        var context=contexts.resolve(a,command);
        return interactive(a,()->{
            contexts.assertCurrent(a,context);
            var replay=receipt(a,"RULE_START",resource,key,hash);if(replay.isPresent())return replay.get();
            SkillAssessmentScope skill=command.purpose()==Purpose.SKILL_ASSESSMENT?skillScope(context):null;
            List<RuleAssessmentAttemptEntity> history;
            if(skill!=null) {
                ensureResolved(a,skill);
                var active=activeSkill(a,skill,true);
                if(active.size()>1)throw new Failure(409,"MULTIPLE_ACTIVE_SKILL_ASSESSMENTS");
                if(active.size()==1) {
                    var result=readLocked(a,active.getFirst().getId());retain(a,"RULE_START",resource,key,hash,result,UUID.randomUUID());return result;
                }
                history=latestSkill(a,skill).stream().toList();
            } else {
                history=attempts.contextHistory(a.organizationId(),a.learnerId(),command.purpose().name(),context.contextKey(),PageRequest.of(0,1));
                if(!history.isEmpty() && "IN_PROGRESS".equals(history.getFirst().getState())) {
                    var current=history.getFirst();if(command.previousAttemptId()!=null)throw new Failure(409,"ASSESSMENT_IN_PROGRESS");
                    var result=readLocked(a,current.getId());retain(a,"RULE_START",resource,key,hash,result,UUID.randomUUID());return result;
                }
            }
            if(history.isEmpty()!= (command.previousAttemptId()==null) || !history.isEmpty() && !history.getFirst().getId().equals(command.previousAttemptId()))
                throw new Failure(409,"RETAKE_CONTEXT_CHANGED");
            if(context.groups().isEmpty())throw new Failure(409,"ASSESSMENT_NOT_REQUIRED");
            com.fasterxml.jackson.databind.node.ObjectNode policyContext;
            try {policyContext=(com.fasterxml.jackson.databind.node.ObjectNode)json.readTree(context.snapshot());}
            catch(java.io.IOException invalid){throw integrity();}
            String ownerId=command.purpose()==Purpose.BASELINE?policyContext.path("roleId").asText():context.groups().getFirst().requirement().skillId();
            String levelId=command.purpose()==Purpose.BASELINE?policyContext.path("levelId").asText():context.groups().getFirst().requirement().knowledgeLevel().name();
            var scope=policyCatalog.scopes(a.organizationId(),command.purpose()).stream()
                    .filter(s->s.ownerId().equals(ownerId) && (command.purpose()==Purpose.BASELINE?s.sharedBaseline():s.contextLevelId().equals(levelId)))
                    .findFirst().orElseThrow(()->new Failure(422,"ASSESSMENT_POLICY_REQUIRED"));
            if(skill!=null && scope.groups().stream().noneMatch(g->g.requirement().skillId().equals(skill.skillId()) && g.requirement().knowledgeLevel()==skill.knowledgeLevel() && skill.skillVersion().equals(g.skillVersion())))
                throw new Failure(409,"SKILL_VERSION_CHANGED");
            policyContext.put("policyScopeKey",scope.key());
            var policy=scopedPolicies.active(a.organizationId(),command.purpose().name(),scope.key()).orElseThrow(()->new Failure(422,"ASSESSMENT_POLICY_REQUIRED"));
            if(!scope.ready() || !scope.matchesCatalog(policy.getCatalogHash()))throw new Failure(422,"ASSESSMENT_POLICY_CATALOG_CHANGED");
            var config=read(policy.getConfiguration(),Policy.class);
            if(command.purpose()==Purpose.BASELINE && config.baselineTiming()==null)throw new Failure(422,"ASSESSMENT_POLICY_REQUIRED");
            if(!RoleBaselineFlow.hash(policy.getHashDomain()+"\n"+command.purpose()+"\n"+write(config)).equals(policy.getConfigurationHash()))throw integrity();
            if((skill==null?attempts.contextCount(a.organizationId(),a.learnerId(),command.purpose().name(),context.contextKey()):skillCount(a,skill))>=config.maxAttempts())
                throw new Failure(409,"RETAKE_LIMIT_REACHED");
            Instant now=attempts.clock();
            if(!history.isEmpty() && now.isBefore(history.getFirst().getFinishedAt().plusSeconds(config.retakeWaitSeconds())))
                throw new Failure(409,"RETAKE_NOT_YET_AVAILABLE");
            var groups=new ArrayList<Group>();int count=0;var random=new java.security.SecureRandom();
            locks.lock("question-bank:"+a.organizationId());
            for(var need:context.groups()) {
                GroupRule rule;try{rule=config.require(need.requirement());}catch(IllegalArgumentException missing){throw new Failure(422,"GROUP_POLICY_REQUIRED");}
                var pool=bank.eligible(a.organizationId(),need.requirement().skillId(),need.requirement().knowledgeLevel().name(),scope.groups().stream().filter(g->g.requirement().key().equals(need.requirement().key())).findFirst().orElseThrow(()->new Failure(422,"GROUP_POLICY_REQUIRED")).skillVersion(),maximum+1);
                if(pool.size()>maximum)throw new Failure(422,"BANK_QUERY_LIMIT_EXCEEDED");
                if(command.purpose()==Purpose.BASELINE) {
                    var unique=new LinkedHashMap<UUID,AssessmentItemKnowledgeMappingJpaRepository.Candidate>();pool.forEach(candidate->unique.putIfAbsent(candidate.getItemVersionId(),candidate));pool=List.copyOf(unique.values());
                    if(pool.isEmpty()) {
                        var member=scope.memberLevels().stream().filter(value->value.id().equals(levelId)).findFirst();
                        var group=scope.groups().stream().filter(value->value.requirement().key().equals(need.requirement().key())).findFirst().orElseThrow();
                        throw new Failure(422,"REQUIRED_GROUP_BANK_EMPTY",List.of(new BaselinePolicyEditor.BankIssue(levelId,member.map(com.adaptlearngraph.entities.domain.AssessmentPolicyScope.MemberLevel::name).orElse(levelId),need.requirement().skillId(),group.skillName(),need.requirement().knowledgeLevel())));
                    }
                    if(pool.size()<rule.totalCount())throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");
                }
                if((count+=rule.totalCount())>maximum)throw new Failure(422,"PAPER_CAPACITY_EXCEEDED");
                try {
                    var candidates=pool.stream().map(c->new Candidate(c.getItemVersionId(),need.requirement(),c.getOutcomeCode(),c.getMandatory(),
                            c.getPrompt(),options(c.getResponseSchema()),correct(c.getProtectedKey()),c.getContentHash(),c.getMappingHash())).toList();
                    groups.add(RuleAssessment.select(need.requirement(),need.role(),rule,candidates,random));
                }catch(IllegalArgumentException insufficient){throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");}
            }
            now=attempts.clock(); // Start the timer only after a complete paper is available.
            int duration;
            try{duration=config.durationSeconds(count);}catch(ArithmeticException overflow){throw new Failure(422,"ASSESSMENT_DURATION_OUT_OF_RANGE");}
            var paper=new Paper(command.purpose(),groups,now,now.plusSeconds(duration));
            if(config.baselineTiming()!=null)policyContext.put("timePerQuestionSeconds",config.baselineTiming().secondsPerQuestion());
            String snapshot;
            snapshot=write(Map.of("context",policyContext,"groupCount",groups.size(),"itemCount",count));
            UUID id=UUID.randomUUID();
            attempts.insert(new RuleAssessmentAttemptEntity(id,a.organizationId(),a.learnerId(),command.purpose().name(),skill==null?context.contextKey():skill.contextKey(),
                    context.selectionId(),context.selectionRevision(),policy.getId(),policy.getConfigurationHash(),snapshot,now,paper.deadlineAt(),command.previousAttemptId()));
            int position=0;
            for(var group:paper.groups()) {
                var requirement=group.requirement();var rule=group.rule();
                attempts.freezeGroup(id,group.id(),a.organizationId(),a.learnerId(),requirement.skillId(),requirement.knowledgeLevel().name(),
                        write(requirement.outcomeCodes()),group.role().name(),rule.totalCount(),rule.requiredCorrectCount(),rule.mandatoryRequired(),rule.allWrongVeto(),rule.mandatoryCount());
                for(var item:group.items())attempts.freezeItem(id,group.id(),++position,a.organizationId(),item.itemVersionId(),
                        write(Map.of("optionIds",item.options().stream().map(Option::id).toList(),"contentHash",item.contentHash(),"mappingHash",item.mappingHash())),item.mandatory());
            }
            var result=readLocked(a,id);
            audit.insert(new com.adaptlearngraph.entities.AuditEventEntity(UUID.randomUUID(),a.learnerId(),"rule-assessment",
                    command.previousAttemptId()==null?"RULE_ASSESSMENT_STARTED":"RULE_ASSESSMENT_RETAKE_STARTED",id,Long.toString(result.revision()),now,"ACCEPTED",id));
            retain(a,"RULE_START",resource,key,hash,result,UUID.randomUUID());return result;
        });
    }
    private RuleAssessmentAttemptEntity owned(RoleBaselineFlow.Actor a,UUID id) {
        if(id==null)throw new Failure(400,"INVALID_REQUEST");
        return attempts.lock(a.organizationId(),a.learnerId(),id).orElseThrow(()->new Failure(404,"NOT_FOUND"));
    }
    private List<Option> options(String value) {try{return json.readValue(json.readTree(value).get("options").toString(),new TypeReference<List<Option>>(){});}catch(Exception invalid){throw integrity();}}
    private String correct(String value) {try{var key=json.readTree(value).get("correctOptionId");if(key==null || !key.isTextual())throw integrity();return key.textValue();}catch(Exception invalid){throw integrity();}}
    private String write(Object value){try{return json.writeValueAsString(value);}catch(Exception invalid){throw integrity();}}
    private <T>T read(String value,Class<T> type){try{return json.readValue(value,type);}catch(Exception invalid){throw integrity();}}
    private Failure integrity(){return new Failure(503,"ASSESSMENT_INTEGRITY_FAILURE");}
    private Optional<View> receipt(RoleBaselineFlow.Actor a,String operation,String resource,UUID key,String hash) {
        return policies.receipt(a.organizationId(),a.learnerId(),operation,resource,key).map(r->{if(!r.getHash().equals(hash))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return read(r.getOutcome(),View.class);});
    }
    private void retain(RoleBaselineFlow.Actor a,String operation,String resource,UUID key,String hash,View result,UUID id) {
        policies.retain(id,a.organizationId(),a.learnerId(),operation,resource,key,hash,write(result));
    }
    private View interactive(RoleBaselineFlow.Actor a,java.util.function.Supplier<View> work) {
        return selections.transaction(a,()->{reauthorize(a);var result=work.get();reauthorize(a);return result;});
    }
    public View resume(UUID id) {
        var a=actor();return interactive(a,()->readLocked(a,id));
    }
    public List<View> history(int page,int size) {
        return history(page,size,null,null);
    }
    public List<View> history(int page,int size,String moduleId,Integer moduleRevision) {
        var a=actor();if(page<0 || size<1 || size>100)throw new Failure(400,"INVALID_REQUEST");
        if((moduleId==null)!=(moduleRevision==null) || moduleId!=null
                && (moduleId.isBlank() || moduleId.length()>200 || moduleRevision<1))throw new Failure(400,"INVALID_REQUEST");
        return selections.transaction(a,()->{
            reauthorize(a);var rows=moduleId==null?attempts.history(a.organizationId(),a.learnerId(),PageRequest.of(page,size)):
                    attempts.moduleHistory(a.organizationId(),a.learnerId(),moduleId,moduleRevision,PageRequest.of(page,size));
            var result=rows.stream()
                    .map(row->readLocked(a,row.getId())).toList();reauthorize(a);return result;
        });
    }
    public SkillHistory skillHistory(String skillId,String level,String version,int page,int size) {
        var a=actor();SkillAssessmentScope scope;
        try{scope=new SkillAssessmentScope(skillId,KnowledgeLevel.valueOf(level),version);}catch(RuntimeException invalid){throw new Failure(400,"INVALID_REQUEST");}
        return skillHistory(a,scope,page,size);
    }
    public SkillHistory moduleSkillHistory(String moduleId,int revision,int page,int size) {
        var a=actor();if(moduleId==null || moduleId.isBlank() || moduleId.length()>200 || revision<1)throw new Failure(400,"INVALID_REQUEST");
        return skillHistory(a,contexts.scopeForModule(a,moduleId,revision),page,size);
    }
    private SkillHistory skillHistory(RoleBaselineFlow.Actor a,SkillAssessmentScope scope,int page,int size) {
        if(page<0 || page>10000 || size<1 || size>100)throw new Failure(400,"INVALID_REQUEST");
        return selections.transaction(a,()->{
            reauthorize(a);
            var rows=attempts.skillHistory(a.organizationId(),a.learnerId(),scope.skillId(),scope.knowledgeLevel().name(),scope.skillVersion(),size+1,page*size);
            var active=activeSkill(a,scope,false);var latest=latestSkill(a,scope);
            long unresolved=attempts.unresolvedSkillCount(a.organizationId(),a.learnerId(),scope.skillId(),scope.knowledgeLevel().name());
            Integer max=null;Instant available=null;String issue=null;
            try {
                var catalog=policyCatalog.scopes(a.organizationId(),Purpose.SKILL_ASSESSMENT).stream()
                    .filter(c->c.ownerId().equals(scope.skillId()) && c.contextLevelId().equals(scope.knowledgeLevel().name())).findFirst()
                    .orElseThrow(()->new Failure(422,"ASSESSMENT_POLICY_REQUIRED"));
                if(catalog.groups().stream().noneMatch(g->g.requirement().skillId().equals(scope.skillId()) && g.requirement().knowledgeLevel()==scope.knowledgeLevel() && scope.skillVersion().equals(g.skillVersion())))
                    throw new Failure(409,"SKILL_VERSION_CHANGED");
                var policy=scopedPolicies.active(a.organizationId(),Purpose.SKILL_ASSESSMENT.name(),catalog.key()).orElseThrow(()->new Failure(422,"ASSESSMENT_POLICY_REQUIRED"));
                if(!catalog.ready() || !catalog.matchesCatalog(policy.getCatalogHash()))throw new Failure(422,"ASSESSMENT_POLICY_CATALOG_CHANGED");
                var config=read(policy.getConfiguration(),Policy.class);
                if(!RoleBaselineFlow.hash(policy.getHashDomain()+"\n"+Purpose.SKILL_ASSESSMENT+"\n"+write(config)).equals(policy.getConfigurationHash()))throw integrity();
                max=config.maxAttempts();
                if(latest.isPresent())available=latest.get().getFinishedAt().plusSeconds(config.retakeWaitSeconds());
            }catch(Failure missing){issue=missing.code;}
            catch(org.springframework.dao.DataAccessException | org.neo4j.driver.exceptions.Neo4jException unavailable){issue="DEPENDENCY_UNAVAILABLE";}
            var admission=contexts.admissionIssue(a,scope);if(admission!=null)issue=admission;
            var result=new SkillHistory(scope,rows.stream().limit(size).map(this::summary).toList(),active.stream().map(this::summary).toList(),
                skillCount(a,scope),unresolved,page,size,rows.size()>size,latest.map(RuleAssessmentAttemptEntity::getId).orElse(null),max,available,issue,attempts.clock());
            reauthorize(a);return result;
        });
    }
    private AttemptSummary summary(RuleAssessmentAttemptEntity row) {
        try {
            var c=json.readTree(row.getContextSnapshot()).get("context");var start=json.treeToValue(c.get("start"),Start.class);
            var target=new Target(row.getSelectionId(),row.getSelectionRevision(),c.path("roleId").asText(""),c.path("roleName").asText(""),c.path("levelId").asText(""),c.path("levelName").asText(""),
                c.path("jobPositionId").asText(""),c.path("jobPositionName").asText(""),start.stepId(),start.moduleId(),start.moduleRevision());
            return new AttemptSummary(row.getId(),target,row.getState(),row.getStartedAt(),row.getDeadlineAt(),row.getFinishedAt(),row.getFinishReason(),row.getPreviousAttemptId());
        }catch(Exception invalid){throw integrity();}
    }
    private SkillAssessmentScope skillScope(Context context) {
        try {
            var mains=context.groups().stream().filter(g->g.role()==GroupRole.MAIN).toList();
            if(mains.size()!=1)throw new IllegalArgumentException();
            var main=mains.getFirst().requirement();
            return SkillAssessmentScope.fromDefinitions(json.readTree(context.snapshot()).get("requirements"),main.skillId(),main.knowledgeLevel());
        }catch(Exception invalid){throw new Failure(409,"SKILL_SCOPE_RECONCILIATION_REQUIRED");}
    }
    private void ensureResolved(RoleBaselineFlow.Actor a,SkillAssessmentScope s) {
        if(attempts.unresolvedSkillCount(a.organizationId(),a.learnerId(),s.skillId(),s.knowledgeLevel().name())>0)throw new Failure(409,"SKILL_SCOPE_RECONCILIATION_REQUIRED");
    }
    private long skillCount(RoleBaselineFlow.Actor a,SkillAssessmentScope s) {return attempts.skillCount(a.organizationId(),a.learnerId(),s.skillId(),s.knowledgeLevel().name(),s.skillVersion());}
    private Optional<RuleAssessmentAttemptEntity> latestSkill(RoleBaselineFlow.Actor a,SkillAssessmentScope s) {
        return attempts.skillLatestFinished(a.organizationId(),a.learnerId(),s.skillId(),s.knowledgeLevel().name(),s.skillVersion()).stream().findFirst();
    }
    private List<RuleAssessmentAttemptEntity> activeSkill(RoleBaselineFlow.Actor a,SkillAssessmentScope s,boolean finishDue) {
        var rows=attempts.skillActive(a.organizationId(),a.learnerId(),s.skillId(),s.knowledgeLevel().name(),s.skillVersion());
        if(rows.size()>1000)throw new Failure(503,"ACTIVE_SKILL_HISTORY_LIMIT");
        if(finishDue) {
            for(var row:rows)if(!attempts.clock().isBefore(row.getDeadlineAt()))readLocked(a,row.getId());
            return attempts.skillActive(a.organizationId(),a.learnerId(),s.skillId(),s.knowledgeLevel().name(),s.skillVersion());
        }
        return rows;
    }
    public View answer(UUID id,Answer answer,UUID key) {
        var a=actor();
        if(id==null || answer==null || key==null || answer.expectedRevision()<1 || answer.itemVersionId()==null
            || answer.position()<1 || answer.selectedOptionId()==null || answer.selectedOptionId().length()>200)
            throw new Failure(400,"INVALID_REQUEST");
        String hash=RoleBaselineFlow.hash(write(answer));
        try {
            return interactive(a,()->{
                var replay=receipt(a,"RULE_ANSWER",id.toString(),key,hash);if(replay.isPresent())return replay.get();
                var row=owned(a,id);
                if(!"IN_PROGRESS".equals(row.getState()) || !attempts.clock().isBefore(row.getDeadlineAt()))
                    return finalizeAndRetain(a,row,"RULE_ANSWER",key,hash);
                contexts.assertAccessible(a,row.getContextSnapshot());
                if(row.getRevision()!=answer.expectedRevision())throw new Failure(409,"STALE_ATTEMPT_REVISION");
                var item=attempts.paper(a.organizationId(),a.learnerId(),id).stream()
                        .filter(i->i.getPosition()==answer.position() && i.getItemVersionId().equals(answer.itemVersionId())).findFirst()
                        .orElseThrow(()->new Failure(400,"INVALID_PRESENTED_ITEM"));
                if(options(item.getResponseSchema()).stream().noneMatch(o->o.id().equals(answer.selectedOptionId())))throw new Failure(400,"INVALID_OPTION");
                UUID command=UUID.randomUUID();
                if(attempts.advance(a.organizationId(),a.learnerId(),id,answer.expectedRevision())!=1)
                    return finalizeAndRetain(a,owned(a,id),"RULE_ANSWER",key,hash);
                if(attempts.answer(a.organizationId(),a.learnerId(),id,answer.position(),write(answer.selectedOptionId()),
                        correct(item.getProtectedKey()).equals(answer.selectedOptionId()),command)!=1)throw integrity();
                var result=readLocked(a,id);retain(a,"RULE_ANSWER",id.toString(),key,hash,result,command);return result;
            });
        }catch(org.springframework.dao.DataIntegrityViolationException failed) {
            // An answer can cross the deadline between revision advance and its DB timestamp.
            // The failed transaction has rolled back. Finalize in a fresh owned transaction; never count the late response.
            return interactive(a,()->{
                var row=owned(a,id);
                if("IN_PROGRESS".equals(row.getState()) && attempts.clock().isBefore(row.getDeadlineAt()))throw failed;
                var replay=receipt(a,"RULE_ANSWER",id.toString(),key,hash);if(replay.isPresent())return replay.get();
                return finalizeAndRetain(a,row,"RULE_ANSWER",key,hash);
            });
        }
    }
    public View submit(UUID id,long revision,UUID key) {
        var a=actor();if(id==null || key==null || revision<1)throw new Failure(400,"INVALID_REQUEST");
        String hash=RoleBaselineFlow.hash("SUBMIT\n"+revision);
        return interactive(a,()->{
            var replay=receipt(a,"RULE_SUBMIT",id.toString(),key,hash);if(replay.isPresent())return replay.get();
            var row=owned(a,id);
            if("IN_PROGRESS".equals(row.getState()) && attempts.clock().isBefore(row.getDeadlineAt()))contexts.assertAccessible(a,row.getContextSnapshot());
            if("IN_PROGRESS".equals(row.getState()) && attempts.clock().isBefore(row.getDeadlineAt()) && row.getRevision()!=revision)
                throw new Failure(409,"STALE_ATTEMPT_REVISION");
            return finalizeAndRetain(a,row,"RULE_SUBMIT",key,hash);
        });
    }
    private View finalizeAndRetain(RoleBaselineFlow.Actor a,RuleAssessmentAttemptEntity row,String operation,UUID key,String hash) {
        var result=finalizeNow(a,row);retain(a,operation,row.getId().toString(),key,hash,result,UUID.randomUUID());return result;
    }
    private View readLocked(RoleBaselineFlow.Actor a,UUID id) {
        var row=owned(a,id);
        if("IN_PROGRESS".equals(row.getState()) && !attempts.clock().isBefore(row.getDeadlineAt()))return finalizeNow(a,row);
        if("IN_PROGRESS".equals(row.getState()))contexts.assertAccessible(a,row.getContextSnapshot());
        return view(a,row,saved(a,row));
    }
    private View view(RoleBaselineFlow.Actor a,RuleAssessmentAttemptEntity row,Saved saved) {
        var names=new HashMap<String,String>();Target target;
        try {
            var context=json.readTree(row.getContextSnapshot()).get("context");
            var start=json.treeToValue(context.get("start"),Start.class);
            target=new Target(row.getSelectionId(),row.getSelectionRevision(),context.path("roleId").asText(""),context.path("roleName").asText(""),
                    context.path("levelId").asText(""),context.path("levelName").asText(""),context.path("jobPositionId").asText(""),context.path("jobPositionName").asText(""),
                    start.stepId(),start.moduleId(),start.moduleRevision());
            for(var definition:context.get("requirements"))names.put(definition.get("requirement").get("skillId").asText(),definition.get("skillName").asText());
        }catch(Exception invalid){throw integrity();}
        var groups=saved.paper().groups().stream().map(g->new GroupView(g.id(),Objects.requireNonNull(names.get(g.requirement().skillId())),g.requirement(),g.role(),g.rule().totalCount(),
                g.rule().requiredCorrectCount(),g.rule().mandatoryRequired())).toList();
        var candidates=new HashMap<UUID,Candidate>();saved.paper().groups().forEach(g->g.items().forEach(i->candidates.put(i.itemVersionId(),i)));
        var mandatoryGroups=new HashSet<UUID>();saved.paper().groups().stream().filter(g->g.rule().mandatoryRequired()).forEach(g->mandatoryGroups.add(g.id()));
        var questions=saved.rows().stream().map(i->new Question(i.getPosition(),i.getItemVersionId(),i.getGroupId(),i.getPrompt(),
                candidates.get(i.getItemVersionId()).options(),saved.answers().get(i.getItemVersionId()),i.getMandatory() && mandatoryGroups.contains(i.getGroupId()))).toList();
        var results=new ArrayList<GroupResult>();
        if("FINALIZED".equals(row.getState())) {
            var stored=attempts.results(a.organizationId(),a.learnerId(),row.getId());
            if(stored.size()!=groups.size())throw integrity();
            for(var group:saved.paper().groups()) {
                var result=stored.stream().filter(r->r.getGroupId().equals(group.id())).findFirst().orElseThrow(this::integrity);
                if(result.getTotalCount()!=group.items().size())throw integrity();
                try {
                    results.add(new GroupResult(group.id(),group.requirement(),group.role(),result.getCorrectCount(),result.getTotalCount(),
                            result.getMandatorySatisfied(),result.getPassed(),result.getVetoTriggered(),
                            json.readValue(result.getReasons(),new TypeReference<List<String>>(){})));
                }catch(java.io.IOException invalid){throw integrity();}
            }
        }
        return new View(row.getId(),Purpose.valueOf(row.getPurpose()),target,row.getState(),row.getRevision(),row.getStartedAt(),row.getDeadlineAt(),attempts.clock(),
                row.getFinishedAt(),row.getFinishReason(),row.getPreviousAttemptId(),groups,questions,List.copyOf(results));
    }
    private View finalizeNow(RoleBaselineFlow.Actor a,RuleAssessmentAttemptEntity row) {
        var data=saved(a,row);
        if("FINALIZED".equals(row.getState()))return view(a,row,data);
        var results=RuleAssessment.score(data.paper(),data.answers());
        for(var result:results) {
            if(attempts.result(a.organizationId(),a.learnerId(),row.getId(),result.groupId(),result.correctCount(),result.totalCount(),
                    result.mandatorySatisfied(),result.passed(),result.vetoTriggered(),write(result.reasons()))!=1)throw integrity();
        }
        if(attempts.finish(a.organizationId(),a.learnerId(),row.getId(),row.getRevision())!=1)throw new Failure(409,"STALE_ATTEMPT_REVISION");
        var finished=owned(a,row.getId());
        var payload=new LinkedHashMap<String,Object>();
        payload.put("payloadVersion",1);payload.put("organizationId",a.organizationId());payload.put("learnerId",a.learnerId());
        payload.put("attemptId",row.getId());payload.put("purpose",row.getPurpose());payload.put("selectionId",row.getSelectionId());
        payload.put("results",results);payload.put("finishedAt",finished.getFinishedAt());
        UUID event=UUID.randomUUID();
        outbox.insert(new OutboxEventEntity(event,"RULE_ASSESSMENT_FINALIZED",row.getId(),finished.getRevision(),
                json.convertValue(payload,new TypeReference<Map<String,Object>>(){}),row.getId(),finished.getFinishedAt()));
        jobs.insert(new com.adaptlearngraph.entities.ProcessingJobEntity(UUID.randomUUID(),event,RuleAssessmentOutcomeJpaRepository.HANDLER,
                finished.getFinishedAt(),finished.getFinishedAt()));
        audit.insert(new com.adaptlearngraph.entities.AuditEventEntity(UUID.randomUUID(),"DEADLINE".equals(finished.getFinishReason())?null:a.learnerId(),
                "rule-assessment","RULE_ASSESSMENT_FINALIZED",row.getId(),Long.toString(finished.getRevision()),finished.getFinishedAt(),"ACCEPTED",row.getId()));
        return view(a,finished,data);
    }
    /** Bounded internal queue: authority comes from persisted attempt owners, never a client organization field. */
    public void expireDue() {
        for(var due:attempts.deadlines(10)) {
            try {tx.executeWithoutResult(status->{
                var owner=new RoleBaselineFlow.Actor(due.getOrganizationId(),due.getLearnerId());
                locks.lock("AB-ATTEMPT-ACTOR-V1\n"+owner.organizationId()+"\n"+owner.learnerId());
                var row=owned(owner,due.getId());
                if("IN_PROGRESS".equals(row.getState()) && !attempts.clock().isBefore(row.getDeadlineAt()))finalizeNow(owner,row);
            });}catch(RuntimeException failure) {
                LOG.warn("Rule attempt {} in organization {} needs finalization retry ({})",due.getId(),due.getOrganizationId(),failure.getClass().getSimpleName());
                try {tx.executeWithoutResult(status->attempts.deferFinalization(due.getOrganizationId(),due.getLearnerId(),due.getId()));}
                catch(RuntimeException unavailable){LOG.warn("Could not retain finalization retry for attempt {}",due.getId());}
            }
        }
    }
    private record Saved(Paper paper,List<RuleAssessmentAttemptJpaRepository.PaperRow> rows,Map<UUID,String> answers) {}
    private Saved saved(RoleBaselineFlow.Actor a,RuleAssessmentAttemptEntity row) {
        var rows=attempts.paper(a.organizationId(),a.learnerId(),row.getId());
        var grouped=new LinkedHashMap<UUID,List<RuleAssessmentAttemptJpaRepository.PaperRow>>();
        var answers=new HashMap<UUID,String>();
        for(var item:rows) {
            grouped.computeIfAbsent(item.getGroupId(),k->new ArrayList<>()).add(item);
            if(item.getAnswer()!=null)answers.put(item.getItemVersionId(),read(item.getAnswer(),String.class));
        }
        var groups=new ArrayList<Group>();
        for(var items:grouped.values()) {
            var g=items.getFirst();
            List<String> outcomes;try{outcomes=json.readValue(g.getOutcomeCodes(),new TypeReference<List<String>>(){});}catch(Exception invalid){throw integrity();}
            var requirement=new Requirement(g.getSkillId(),KnowledgeLevel.valueOf(g.getKnowledgeLevel()),outcomes);
            var rule=new GroupRule(g.getSkillId(),requirement.knowledgeLevel(),g.getTotalCount(),g.getRequiredCorrectCount(),g.getMandatoryRequired(),g.getAllWrongVeto(),g.getMandatoryCount());
            var candidates=new ArrayList<Candidate>();
            for(var item:items) {
                try {
                    var frozen=json.readTree(item.getFrozenItem());
                    if(!item.getContentHash().equals(frozen.path("contentHash").asText()) || !item.getMappingHash().equals(frozen.path("mappingHash").asText()))throw integrity();
                    var original=options(item.getResponseSchema());
                    var order=json.readValue(frozen.get("optionIds").toString(),new TypeReference<List<String>>(){});
                    if(order.size()!=original.size() || new HashSet<>(order).size()!=order.size())throw integrity();
                    var ordered=order.stream().map(id->original.stream().filter(o->o.id().equals(id)).findFirst().orElseThrow(this::integrity)).toList();
                    candidates.add(new Candidate(item.getItemVersionId(),requirement,item.getOutcomeCode(),item.getMandatory(),item.getPrompt(),
                            ordered,correct(item.getProtectedKey()),item.getContentHash(),item.getMappingHash()));
                }catch(java.io.IOException invalid){throw integrity();}
            }
            groups.add(new Group(g.getGroupId(),requirement,GroupRole.valueOf(g.getRole()),rule,candidates));
        }
        try {
            var snapshot=json.readTree(row.getContextSnapshot());
            if(snapshot.path("groupCount").asInt(-1)!=groups.size() || snapshot.path("itemCount").asInt(-1)!=rows.size())throw integrity();
        }catch(java.io.IOException invalid){throw integrity();}
        return new Saved(new Paper(Purpose.valueOf(row.getPurpose()),groups,row.getStartedAt(),row.getDeadlineAt()),rows,Map.copyOf(answers));
    }
}
