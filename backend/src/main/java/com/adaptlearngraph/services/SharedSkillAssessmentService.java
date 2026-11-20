package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.AssessmentRulePolicyEntity;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.Scope;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/** Workspace-wide settings. Exact immutable per-Skill papers are derived only when needed. */
public final class SharedSkillAssessmentService {
    public static final String KEY=RoleBaselineFlow.hash("WORKSPACE_SHARED_SKILL_ASSESSMENT_V1");
    private static final String PURPOSE="SKILL_ASSESSMENT";
    public record Rule(int totalCount,int requiredCorrectCount,int mandatoryCount,boolean allWrongVeto) {}
    public record Configuration(String name,Map<String,Rule> levels,Rule prerequisite,int secondsPerQuestion,int maxAttempts,int retakeWaitSeconds) {}
    public record Capacity(String level,int maxQuestions,int mandatoryQuestions,int skillCount,int skippedSkills,List<String> limitingSkills) {}
    public record Draft(UUID id,long revision,Configuration configuration,Instant updatedAt) {}
    public record Version(UUID id,long version,Configuration configuration,Instant createdAt) {}
    public record Workspace(Draft draft,Version active,List<Version> versions,long totalVersions,long activationRevision,
                            List<Capacity> capacities,String capacityHash,Configuration defaults,int legacyActiveScopes) {}
    public record Command(UUID commandKey,String action,UUID draftId,long expectedRevision,long expectedActivationRevision,
                          String capacityHash,Configuration configuration) {}
    private record Pool(String skill,String name,String level,String version,int count,int mandatory) {}
    private record Bank(List<Pool> pools,List<Capacity> capacities,String hash) {}
    private final SubscriptionIdentity identity;private final SubscriptionWorkspaceStore memberships;
    private final AssessmentPolicyCatalog catalog;private final ScopedAssessmentPolicyJpaRepository scopes;
    private final AssessmentRulePolicyJpaRepository policies;private final AssessmentItemKnowledgeMappingJpaRepository items;
    private final PostgresAdvisoryLocks locks;private final TransactionTemplate tx;private final ObjectMapper json;private final int maximum;
    public SharedSkillAssessmentService(SubscriptionIdentity identity,SubscriptionWorkspaceStore memberships,AssessmentPolicyCatalog catalog,
            ScopedAssessmentPolicyJpaRepository scopes,AssessmentRulePolicyJpaRepository policies,AssessmentItemKnowledgeMappingJpaRepository items,
            PostgresAdvisoryLocks locks,TransactionTemplate tx,ObjectMapper json,int maximum) {
        this.identity=identity;this.memberships=memberships;this.catalog=catalog;this.scopes=scopes;this.policies=policies;this.items=items;this.locks=locks;this.tx=tx;this.json=json;this.maximum=maximum;
    }
    private SubscriptionAccessPolicy.Actor staff() {
        var actor=identity.current().actor();
        if(actor.organizationId()==null || !actor.roles().contains(SubscriptionAccessPolicy.Role.DOMAIN_EXPERT))throw new Failure(403,"FORBIDDEN");
        memberships.require(actor,actor.organizationId(),SubscriptionAccessPolicy.Action.WORKSPACE,Instant.now());return actor;
    }
    private void lock(UUID org){locks.lock("ASSESSMENT-RULE-POLICY\n"+org+"\n"+PURPOSE);}
    public void authorize(){staff();}
    public Workspace read(int page,String search,String sort) {
        if(page<0 || page>10000 || search==null || search.length()>200 || !Set.of("latest","name").contains(sort))throw new Failure(400,"INVALID_REQUEST");var actor=staff();
        return tx.execute(status->{lock(actor.organizationId());return workspace(actor.organizationId(),page,search,sort);});
    }
    private Bank bank(UUID org) {
        var all=catalog.scopes(org,Purpose.SKILL_ASSESSMENT);var pools=new TreeMap<String,Pool>();
        for(var scope:all)for(var group:scope.groups()) {
            var need=group.requirement();String key=need.key();if(pools.containsKey(key))continue;
            var available=group.skillVersion()==null?null:items.poolCounts(org,need.skillId(),need.knowledgeLevel().name(),group.skillVersion());
            pools.put(key,new Pool(need.skillId(),group.skillName(),need.knowledgeLevel().name(),group.skillVersion(),available==null?0:(int)Math.min(Integer.MAX_VALUE,available.getTotal()),available==null?0:(int)Math.min(Integer.MAX_VALUE,available.getMandatory())));
        }
        var capacities=new ArrayList<Capacity>();
        for(var level:KnowledgeLevel.values()) {
            var matching=pools.values().stream().filter(p->p.level().equals(level.name())).toList();var positive=matching.stream().filter(p->p.count()>0).toList();
            int minimum=positive.stream().mapToInt(Pool::count).min().orElse(0),limit=Math.min(500,minimum),mandatory=positive.stream().mapToInt(Pool::mandatory).min().orElse(0);
            capacities.add(new Capacity(level.name(),limit,Math.min(limit,mandatory),positive.size(),matching.size()-positive.size(),positive.stream().filter(p->p.count()==minimum).map(Pool::name).toList()));
        }
        var advanced=capacities.get(2);capacities.add(new Capacity("PREREQUISITE",advanced.maxQuestions(),advanced.mandatoryQuestions(),advanced.skillCount(),advanced.skippedSkills(),advanced.limitingSkills()));
        return new Bank(List.copyOf(pools.values()),List.copyOf(capacities),RoleBaselineFlow.hash(write(pools.values())));
    }
    private Rule defaultRule(Capacity cap){int total=cap.maxQuestions()>0?cap.maxQuestions():5;return new Rule(total,Math.max(1,(int)Math.ceil(total*0.6)),Math.min(1,cap.mandatoryQuestions()),false);}
    private Configuration defaults(Bank bank) {
        var levels=new TreeMap<String,Rule>();for(var cap:bank.capacities())if(!cap.level().equals("PREREQUISITE"))levels.put(cap.level(),defaultRule(cap));
        var prerequisite=defaultRule(bank.capacities().get(3));return new Configuration("Skill Assessment configuration",levels,new Rule(prerequisite.totalCount(),prerequisite.requiredCorrectCount(),prerequisite.mandatoryCount(),true),60,10,0);
    }
    private Version version(AssessmentRulePolicyEntity p){return new Version(p.getId(),p.getVersion(),decode(p.getConfiguration(),Configuration.class),p.getCreatedAt());}
    private Workspace workspace(UUID org,int page) {
        return workspace(org,page,"","latest");
    }
    private Workspace workspace(UUID org,int page,String search,String sort) {
        var bank=bank(org);var draft=scopes.draft(org,PURPOSE,KEY).map(d->new Draft(d.getId(),d.getRevision(),decode(d.getConfiguration(),Configuration.class),d.getUpdatedAt())).orElse(null);
        var active=scopes.active(org,PURPOSE,KEY).map(this::version).orElse(null);
        int legacy=(int)scopes.summaries(org,PURPOSE).stream().filter(s->!KEY.equals(s.getScopeKey())&&s.getActiveId()!=null).count();
        return new Workspace(draft,active,scopes.sharedHistory(org,PURPOSE,KEY,search,sort,PageRequest.of(page,10)).stream().map(this::version).toList(),scopes.sharedHistoryCount(org,PURPOSE,KEY,search),scopes.revision(org,PURPOSE,KEY).orElse(0L),bank.capacities(),bank.hash(),defaults(bank),legacy);
    }
    private void validate(Configuration c,Bank bank) {
        if(c==null || c.name()==null || c.name().isBlank() || c.name().length()>200 || c.levels()==null || !c.levels().keySet().equals(Set.of("FOUNDATION","INTERMEDIATE","ADVANCED"))
                || c.prerequisite()==null || c.secondsPerQuestion()<1 || c.secondsPerQuestion()>3600 || c.maxAttempts()<1 || c.maxAttempts()>1000 || c.retakeWaitSeconds()<0)throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
        for(var cap:bank.capacities()) {
            var r=cap.level().equals("PREREQUISITE")?c.prerequisite():c.levels().get(cap.level());
            if(r==null || r.totalCount()<1 || r.totalCount()>500 || r.requiredCorrectCount()<1 || r.requiredCorrectCount()>r.totalCount() || r.mandatoryCount()<0 || r.mandatoryCount()>r.totalCount())throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
            if(cap.maxQuestions()>0 && (r.totalCount()>cap.maxQuestions() || r.mandatoryCount()>cap.mandatoryQuestions()))throw new Failure(422,"QUESTION_COUNT_OUT_OF_RANGE");
        }
    }
    public Workspace command(Command command) {
        var actor=staff();if(command==null || command.commandKey()==null || command.action()==null || !Set.of("SAVE_DRAFT","SAVE_ACTIVATE","ACTIVATE","ABANDON").contains(command.action()))throw new Failure(400,"INVALID_REQUEST");
        return tx.execute(status->{
            lock(actor.organizationId());var org=actor.organizationId();String hash=RoleBaselineFlow.hash(write(command));
            var receipt=policies.receipt(org,actor.accountId(),"SHARED_SKILL_CONFIGURATION",KEY,command.commandKey());
            if(receipt.isPresent()){if(!hash.equals(receipt.get().getHash()))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return workspace(org,0);}
            var current=scopes.draft(org,PURPOSE,KEY).orElse(null);
            if(scopes.revision(org,PURPOSE,KEY).orElse(0L)!=command.expectedActivationRevision() || !Objects.equals(current==null?null:current.getId(),command.draftId()) || (current==null?0:current.getRevision())!=command.expectedRevision())throw new Failure(409,"STALE_POLICY_DRAFT");
            var bank=bank(org);
            if(!bank.hash().equals(command.capacityHash()))throw new Failure(409,"POLICY_CATALOG_CHANGED");
            if(command.action().equals("ABANDON")) {
                if(current==null || scopes.abandon(org,PURPOSE,KEY,current.getId(),current.getRevision(),actor.accountId())!=1 || scopes.consume(org,PURPOSE,KEY,current.getId(),current.getRevision())!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
            } else {
                Configuration c=command.action().equals("ACTIVATE")?(current==null?null:decode(current.getConfiguration(),Configuration.class)):command.configuration();validate(c,bank);
                UUID draft=current==null?UUID.randomUUID():current.getId();long revision=current==null?1:current.getRevision()+1;
                if(!command.action().equals("ACTIVATE")) {
                    int saved=current==null?scopes.create(org,PURPOSE,KEY,draft,write(c),KEY,actor.accountId()):scopes.update(org,PURPOSE,KEY,draft,current.getRevision(),write(c),KEY,actor.accountId());
                    if(saved!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
                } else revision=current.getRevision();
                if(command.action().equals("ACTIVATE") || command.action().equals("SAVE_ACTIVATE")) {
                    if(bank.capacities().stream().allMatch(cap->cap.maxQuestions()==0))throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");
                    String body=write(c);var policy=new AssessmentRulePolicyEntity(UUID.randomUUID(),org,PURPOSE,scopes.maxVersion(org,PURPOSE,KEY)+1,body,
                            RoleBaselineFlow.hash(AssessmentRulePolicyEntity.HASH_DOMAIN+"\n"+PURPOSE+"\n"+body),actor.accountId(),Instant.now(),KEY,KEY);
                    policies.insert(policy);scopes.activate(org,PURPOSE,KEY,policy.getId(),actor.accountId());if(scopes.consume(org,PURPOSE,KEY,draft,revision)!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
                }
            }
            policies.retain(UUID.randomUUID(),org,actor.accountId(),"SHARED_SKILL_CONFIGURATION",KEY,command.commandKey(),hash,"{}");return workspace(org,0);
        });
    }
    /** Called inside the existing learner transaction; no active shared setting means existing scoped policies remain valid. */
    public Optional<AssessmentRulePolicyEntity> resolve(UUID org,Scope scope,boolean persist) {
        lock(org);var active=scopes.active(org,PURPOSE,KEY);if(active.isEmpty())return Optional.empty();
        var setting=decode(active.get().getConfiguration(),Configuration.class);var bank=bank(org);var groups=new ArrayList<GroupRule>();
        for(var group:scope.groups()) {
            var need=group.requirement();var pool=bank.pools().stream().filter(p->p.skill().equals(need.skillId())&&p.level().equals(need.knowledgeLevel().name())&&Objects.equals(p.version(),group.skillVersion())).findFirst().orElseThrow(()->new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK"));
            if(pool.count()==0)throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");
            boolean prerequisite=!need.skillId().equals(scope.ownerId());String category=prerequisite?"PREREQUISITE":need.knowledgeLevel().name();
            var rule=prerequisite?setting.prerequisite():setting.levels().get(category);var cap=bank.capacities().stream().filter(c->c.level().equals(category)).findFirst().orElseThrow();
            int total=Math.min(rule.totalCount(),cap.maxQuestions()),correct=Math.min(rule.requiredCorrectCount(),total);
            int mandatory=Math.max(Math.min(rule.mandatoryCount(),Math.min(cap.mandatoryQuestions(),Math.min(pool.mandatory(),total))),Math.max(0,total-(pool.count()-pool.mandatory())));
            groups.add(new GroupRule(need.skillId(),need.knowledgeLevel(),total,correct,mandatory>0,prerequisite&&rule.allWrongVeto(),mandatory));
        }
        int count=groups.stream().mapToInt(GroupRule::totalCount).sum();if(count>maximum)throw new Failure(422,"PAPER_CAPACITY_EXCEEDED");
        var config=new Policy(Math.multiplyExact(count,setting.secondsPerQuestion()),setting.retakeWaitSeconds(),setting.maxAttempts(),groups);String body=write(config);
        String hash=RoleBaselineFlow.hash(AssessmentRulePolicyEntity.HASH_DOMAIN+"\n"+PURPOSE+"\n"+body);
        UUID id=UUID.nameUUIDFromBytes((org+":"+scope.key()+":"+active.get().getId()+":"+scope.catalogHash()+":"+hash).getBytes(java.nio.charset.StandardCharsets.UTF_8));
        var existing=policies.owned(org,PURPOSE,id);if(existing.isPresent())return existing;
        var derived=new AssessmentRulePolicyEntity(id,org,PURPOSE,scopes.maxVersion(org,PURPOSE,scope.key())+1,body,hash,active.get().getCreatedBy(),Instant.now(),scope.key(),scope.catalogHash());
        if(persist)policies.insert(derived);return Optional.of(derived);
    }
    private String write(Object value){try{return json.writeValueAsString(value);}catch(Exception failure){throw new Failure(503,"DEPENDENCY_UNAVAILABLE");}}
    private <T>T decode(String value,Class<T> type){try{return json.readValue(value,type);}catch(Exception failure){throw new Failure(503,"DEPENDENCY_UNAVAILABLE");}}
}
