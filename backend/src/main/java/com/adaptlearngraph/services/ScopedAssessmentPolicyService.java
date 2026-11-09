package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.AssessmentRulePolicyEntity;
import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.Scope;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

/** One trusted configuration path; scopes/drafts never change an already frozen learner paper. */
public final class ScopedAssessmentPolicyService {
    public record Choice(String key,String ownerId,String ownerName,String levelId,String levelName,int rank,boolean ready) {}
    public record Row(Choice scope,String status,boolean hasDraft,Long activeVersion,long versionCount,boolean draftIncomplete,long archivedCount) {}
    public record Directory(List<Row> rows,long total,List<Choice> choices,List<com.adaptlearngraph.entities.domain.AssessmentPolicyScope.Issue> issues) {}
    public record Draft(UUID id,long revision,Policy configuration,String catalogHash,Instant updatedAt,BaselinePolicyEditor.Progress editorState) {}
    public record Version(UUID id,long version,Policy configuration,String catalogHash,Instant createdAt) {}
    public record AbandonedDraft(UUID id,long revision,Policy configuration,String catalogHash,Instant updatedAt,
                                 BaselinePolicyEditor.Progress editorState,Instant abandonedAt) {}
    public record GroupCapacity(String skillId,com.adaptlearngraph.entities.domain.KnowledgeLevel knowledgeLevel,int minQuestions,int maxQuestions,int mandatoryQuestions) {}
    public record Workspace(Scope scope,Draft draft,Version active,long activationRevision,List<Version> versions,long totalVersions,
                            List<BaselinePolicyEditor.Capacity> capacities,int maxPaperItems,List<AbandonedDraft> abandonedDrafts,long totalAbandonedDrafts,List<GroupCapacity> groupCapacities) {
        public Workspace {
            groupCapacities=groupCapacities==null?List.of():List.copyOf(groupCapacities);
            capacities=capacities==null?List.of():List.copyOf(capacities);
            abandonedDrafts=abandonedDrafts==null?List.of():List.copyOf(abandonedDrafts);
        }
    }
    public record Create(UUID commandKey,long expectedActivationRevision) {}
    public record Save(UUID commandKey,UUID draftId,long expectedRevision,String expectedCatalogHash,Policy configuration) {}
    public record SaveEditor(UUID commandKey,UUID draftId,long expectedRevision,String expectedCatalogHash,BaselinePolicyEditor.Progress editorState) {}
    public record Activate(UUID commandKey,UUID draftId,long expectedRevision,long expectedActivationRevision,String expectedCatalogHash) {}
    public record Complete(UUID commandKey,UUID draftId,long expectedRevision,long expectedActivationRevision,String expectedCatalogHash,BaselinePolicyEditor.Progress editorState) {}
    public record Abandon(UUID commandKey,UUID draftId,long expectedRevision) {}
    private final SubscriptionIdentity identity;private final SubscriptionWorkspaceStore memberships;
    private final AssessmentPolicyCatalog catalog;private final ScopedAssessmentPolicyJpaRepository scopes;
    private final AssessmentRulePolicyJpaRepository policies;private final AssessmentItemKnowledgeMappingJpaRepository bank;
    private final PostgresAdvisoryLocks locks;private final TransactionTemplate tx;private final ObjectMapper json;
    private final int maximum;private final BaselinePolicyEditor editor;
    public ScopedAssessmentPolicyService(SubscriptionIdentity identity,SubscriptionWorkspaceStore memberships,AssessmentPolicyCatalog catalog,
            ScopedAssessmentPolicyJpaRepository scopes,AssessmentRulePolicyJpaRepository policies,AssessmentItemKnowledgeMappingJpaRepository bank,
            PostgresAdvisoryLocks locks,TransactionTemplate tx,ObjectMapper json,int maximum) {
        if(maximum<1 || maximum>10000)throw new IllegalArgumentException("Invalid paper capacity");this.maximum=maximum;
        this.identity=identity;this.memberships=memberships;this.catalog=catalog;this.scopes=scopes;this.policies=policies;
        this.bank=bank;this.locks=locks;this.tx=tx;this.json=json;this.editor=new BaselinePolicyEditor(bank,maximum);
    }
    private SubscriptionAccessPolicy.Actor actor(Purpose purpose) {
        if(purpose==null)throw new Failure(400,"INVALID_REQUEST");
        var a=identity.current().actor();var required=purpose==Purpose.BASELINE?SubscriptionAccessPolicy.Role.LD_MANAGER:SubscriptionAccessPolicy.Role.DOMAIN_EXPERT;
        if(a.organizationId()==null || !a.roles().contains(required))throw new Failure(403,"FORBIDDEN");
        memberships.require(a,a.organizationId(),SubscriptionAccessPolicy.Action.WORKSPACE,Instant.now());return a;
    }
    public void authorize(Purpose purpose){actor(purpose);}
    private <T>T locked(SubscriptionAccessPolicy.Actor a,Purpose purpose,Supplier<T> work) {
        return tx.execute(status->{
            // Retain the purpose advisory lock: it serializes same-scope publication as well as legacy callers.
            // Scoped version uniqueness is additionally enforced by the database index.
            locks.lock("ASSESSMENT-RULE-POLICY\n"+a.organizationId()+"\n"+purpose);
            if(!a.equals(actor(purpose)))throw new Failure(403,"FORBIDDEN");
            T result=work.get();if(!a.equals(actor(purpose)))throw new Failure(403,"FORBIDDEN");
            // Recheck current Role responsibility on reads and exact receipt replays too.
            if(result instanceof Workspace workspace)require(a,purpose,workspace.scope().key());
            if(result instanceof Directory directory && purpose==Purpose.SKILL_ASSESSMENT) {
                var allowed=catalog.discoverForEditor(a.organizationId(),purpose,a.accountId()).scopes().stream()
                        .map(Scope::key).collect(java.util.stream.Collectors.toSet());
                if(directory.choices().stream().anyMatch(choice->!allowed.contains(choice.key())))throw new Failure(403,"FORBIDDEN");
            }
            return result;
        });
    }
    public Directory directory(Purpose purpose,String search,String owner,String level,String filter,int page,int size) {
        var a=actor(purpose);bounds(page,size);
        if(search.length()>200 || owner.length()>200 || level.length()>200 || !Set.of("","UNCONFIGURED","DRAFT","ACTIVE","HISTORY").contains(filter)
                || !level.isEmpty() && owner.isEmpty())throw new Failure(400,"INVALID_REQUEST");
        return locked(a,purpose,()->{
            var discovery=catalog.discoverForEditor(a.organizationId(),purpose,a.accountId());var all=discovery.scopes();var summaries=scopes.summaries(a.organizationId(),purpose.name());
            if(summaries.size()>10000)throw new Failure(422,"CATALOG_CAPACITY_EXCEEDED");
            var states=new HashMap<String,ScopedAssessmentPolicyJpaRepository.Summary>();summaries.forEach(s->states.put(s.getScopeKey(),s));
            var rows=new ArrayList<Row>();String query=search.strip().toLowerCase(Locale.ROOT);
            for(var scope:all) {
                var s=states.get(scope.key());boolean draft=s!=null && s.getDraftId()!=null,active=s!=null && s.getActiveId()!=null;
                long count=s==null?0:s.getVersionCount(),abandoned=s==null?0:s.getAbandonedCount();
                long archived=count-(active?1:0)+abandoned;
                String state=active?"ACTIVE":draft?"DRAFT":count>0 || abandoned>0?"HISTORY":"UNCONFIGURED";
                if(!scope.ownerName().toLowerCase(Locale.ROOT).contains(query) && !scope.ownerId().toLowerCase(Locale.ROOT).contains(query))continue;
                if(!owner.isEmpty() && !scope.ownerId().equals(owner) || !level.isEmpty() && !scope.levelId().equals(level))continue;
                if(filter.equals("HISTORY")) {if(archived==0)continue;}
                else if(filter.isEmpty() && state.equals("HISTORY"))continue;
                else if(!filter.isEmpty() && !(filter.equals("DRAFT")?draft:filter.equals(state)))continue;
                rows.add(new Row(choice(scope),filter.equals("HISTORY")?"HISTORY":state,
                        draft,active?s.getActiveVersion():null,count,draft && s.getDraftIncomplete(),archived));
            }
            rows.sort(Comparator.comparingInt((Row r)->(r.hasDraft()?0:r.status().equals("UNCONFIGURED")?1:2))
                    .thenComparing(r->r.scope().ownerName(),String.CASE_INSENSITIVE_ORDER).thenComparing(r->r.scope().ownerId())
                    .thenComparingInt(r->r.scope().rank()).thenComparing(r->r.scope().levelId()).thenComparing(r->r.scope().key()));
            long total=rows.size();int start=(int)Math.min((long)page*size,total);
            var issues=discovery.issues().stream().filter(issue->(owner.isEmpty() || owner.equals(issue.ownerId()))
                    && (query.isEmpty() || issue.ownerName().toLowerCase(Locale.ROOT).contains(query) || issue.ownerId().toLowerCase(Locale.ROOT).contains(query))).toList();
            return new Directory(List.copyOf(rows.subList(start,Math.min(start+size,rows.size()))),total,all.stream().map(ScopedAssessmentPolicyService::choice).toList(),issues);
        });
    }
    public Workspace read(Purpose purpose,String key,int page,int size) {
        var a=actor(purpose);bounds(page,size);return locked(a,purpose,()->workspace(a,purpose,require(a,purpose,key),page,size));
    }
    public Workspace create(Purpose purpose,String key,Create command) {
        var a=actor(purpose);if(command==null || command.expectedActivationRevision()<0)throw new Failure(400,"INVALID_REQUEST");
        return mutate(a,purpose,key,"CREATE_SCOPED_DRAFT",command.commandKey(),command,scope->{
            var draft=scopes.draft(a.organizationId(),purpose.name(),key);
            if(draft.isEmpty()) {
                if(revision(a,purpose,key)!=command.expectedActivationRevision())throw new Failure(409,"STALE_POLICY_ACTIVATION");
                var active=scopes.active(a.organizationId(),purpose.name(),key);
                scopes.create(a.organizationId(),purpose.name(),key,UUID.randomUUID(),active.map(AssessmentRulePolicyEntity::getConfiguration).orElse(null),scope.catalogHash(),a.accountId());
            }
        });
    }
    public Workspace save(Purpose purpose,String key,Save command) {
        var a=actor(purpose);if(command==null || command.draftId()==null || command.expectedRevision()<1 || command.configuration()==null)throw new Failure(400,"INVALID_REQUEST");
        return mutate(a,purpose,key,"SAVE_SCOPED_DRAFT",command.commandKey(),command,scope->{
            current(scope,command.expectedCatalogHash());validate(scope,command.configuration());
            if(purpose==Purpose.BASELINE)editor.validatePolicy(a.organizationId(),scope,command.configuration());
            else for(var capacity:groupCapacities(a.organizationId(),scope)) {
                var rule=command.configuration().groups().stream().filter(g->g.skillId().equals(capacity.skillId()) && g.knowledgeLevel()==capacity.knowledgeLevel()).findFirst().orElseThrow();
                if(rule.totalCount()<capacity.minQuestions() || rule.totalCount()>capacity.maxQuestions())throw new Failure(422,"QUESTION_COUNT_OUT_OF_RANGE");
            }
            if(scopes.update(a.organizationId(),purpose.name(),key,command.draftId(),command.expectedRevision(),write(command.configuration()),scope.catalogHash(),a.accountId())!=1)
                throw new Failure(409,"STALE_POLICY_DRAFT");
        });
    }
    public Workspace saveEditor(Purpose purpose,String key,SaveEditor command) {
        var a=actor(purpose);
        if(purpose!=Purpose.BASELINE || command==null || command.draftId()==null || command.expectedRevision()<1 || command.editorState()==null)
            throw new Failure(400,"INVALID_REQUEST");
        return mutate(a,purpose,key,"SAVE_BASELINE_EDITOR",command.commandKey(),command,scope->{
            current(scope,command.expectedCatalogHash());
            var policy=editor.validate(a.organizationId(),scope,command.editorState());
            if(policy!=null)validate(scope,policy);
            if(scopes.updateEditor(a.organizationId(),purpose.name(),key,command.draftId(),command.expectedRevision(),policy==null?null:write(policy),
                    write(command.editorState()),scope.catalogHash(),a.accountId())!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
        });
    }
    public Workspace activate(Purpose purpose,String key,Activate command) {
        var a=actor(purpose);if(command==null || command.draftId()==null || command.expectedRevision()<1 || command.expectedActivationRevision()<0)throw new Failure(400,"INVALID_REQUEST");
        return mutate(a,purpose,key,"ACTIVATE_SCOPED_POLICY",command.commandKey(),command,scope->{
            current(scope,command.expectedCatalogHash());
            var draft=scopes.draft(a.organizationId(),purpose.name(),key).orElseThrow(()->new Failure(409,"STALE_POLICY_DRAFT"));
            if(!draft.getId().equals(command.draftId()) || draft.getRevision()!=command.expectedRevision())throw new Failure(409,"STALE_POLICY_DRAFT");
            if(revision(a,purpose,key)!=command.expectedActivationRevision())throw new Failure(409,"STALE_POLICY_ACTIVATION");
            current(scope,draft.getCatalogHash());
            if(draft.getConfiguration()==null)throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
            publish(a,purpose,key,scope,read(draft.getConfiguration(),Policy.class),draft.getId(),draft.getRevision());
        });
    }
    public Workspace complete(Purpose purpose,String key,Complete command) {
        var a=actor(purpose);
        if(purpose!=Purpose.BASELINE || command==null || command.draftId()==null || command.expectedRevision()<1
                || command.expectedActivationRevision()<0 || command.editorState()==null || !command.editorState().completed())
            throw new Failure(400,"INVALID_REQUEST");
        return mutate(a,purpose,key,"COMPLETE_AND_ACTIVATE_BASELINE",command.commandKey(),command,scope->{
            current(scope,command.expectedCatalogHash());
            var draft=scopes.draft(a.organizationId(),purpose.name(),key).orElseThrow(()->new Failure(409,"STALE_POLICY_DRAFT"));
            if(!draft.getId().equals(command.draftId()) || draft.getRevision()!=command.expectedRevision())throw new Failure(409,"STALE_POLICY_DRAFT");
            if(revision(a,purpose,key)!=command.expectedActivationRevision())throw new Failure(409,"STALE_POLICY_ACTIVATION");
            // Validate the submitted review snapshot and publish in the same transaction. Failure retains the original draft.
            var config=editor.validate(a.organizationId(),scope,command.editorState());
            publish(a,purpose,key,scope,config,draft.getId(),draft.getRevision());
        });
    }
    public Workspace abandon(Purpose purpose,String key,Abandon command) {
        var a=actor(purpose);
        if(purpose!=Purpose.BASELINE || command==null || command.draftId()==null || command.expectedRevision()<1)throw new Failure(400,"INVALID_REQUEST");
        return mutate(a,purpose,key,"ABANDON_BASELINE_DRAFT",command.commandKey(),command,scope->{
            if(scopes.abandon(a.organizationId(),purpose.name(),key,command.draftId(),command.expectedRevision(),a.accountId())!=1
                    || scopes.consume(a.organizationId(),purpose.name(),key,command.draftId(),command.expectedRevision())!=1)
                throw new Failure(409,"STALE_POLICY_DRAFT");
        });
    }
    private void publish(SubscriptionAccessPolicy.Actor a,Purpose purpose,String key,Scope scope,Policy config,UUID draftId,long expectedRevision) {
        validate(scope,config);readiness(a,scope,config);
        if(purpose==Purpose.BASELINE)editor.validatePolicy(a.organizationId(),scope,config);
        String body=write(config);String hash=RoleBaselineFlow.hash(AssessmentRulePolicyEntity.HASH_DOMAIN+"\n"+purpose+"\n"+body);
        var version=new AssessmentRulePolicyEntity(UUID.randomUUID(),a.organizationId(),purpose.name(),scopes.maxVersion(a.organizationId(),purpose.name(),key)+1,
                body,hash,a.accountId(),Instant.now(),key,scope.catalogHash());
        policies.insert(version);scopes.activate(a.organizationId(),purpose.name(),key,version.getId(),a.accountId());
        if(scopes.consume(a.organizationId(),purpose.name(),key,draftId,expectedRevision)!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
    }
    private Workspace mutate(SubscriptionAccessPolicy.Actor a,Purpose purpose,String key,String operation,UUID retry,Object command,java.util.function.Consumer<Scope> work) {
        if(retry==null)throw new Failure(400,"INVALID_REQUEST");
        return locked(a,purpose,()->{
            var scope=require(a,purpose,key);String resource=purpose+":"+key,hash=RoleBaselineFlow.hash(write(command));
            var receipt=policies.receipt(a.organizationId(),a.accountId(),operation,resource,retry);
            if(receipt.isPresent()) {
                if(!receipt.get().getHash().equals(hash))throw new Failure(409,"IDEMPOTENCY_CONFLICT");
                return replayWorkspace(a,purpose,key,read(receipt.get().getOutcome(),Workspace.class));
            }
            work.accept(scope);current(require(a,purpose,key),scope.catalogHash());
            var result=workspace(a,purpose,scope,0,20);
            policies.retain(UUID.randomUUID(),a.organizationId(),a.accountId(),operation,resource,retry,hash,write(result));return result;
        });
    }
    // Keep immutable command receipts intact. Only project their version labels from the
    // current policy identity after the one-time scope numbering migration.
    private Workspace replayWorkspace(SubscriptionAccessPolicy.Actor actor,Purpose purpose,String key,Workspace retained) {
        if(retained.scope().purpose()!=purpose || !retained.scope().key().equals(key))throw new Failure(503,"POLICY_INTEGRITY_FAILURE");
        java.util.function.Function<Version,Version> number=value->{
            if(value==null)return null;
            var row=policies.owned(actor.organizationId(),purpose.name(),value.id()).orElseThrow(()->new Failure(503,"POLICY_INTEGRITY_FAILURE"));
            if(!key.equals(row.getScopeKey()))throw new Failure(503,"POLICY_INTEGRITY_FAILURE");
            return version(row);
        };
        return new Workspace(retained.scope(),retained.draft(),number.apply(retained.active()),retained.activationRevision(),
                retained.versions().stream().map(number).toList(),retained.totalVersions(),retained.capacities(),retained.maxPaperItems(),
                retained.abandonedDrafts(),retained.totalAbandonedDrafts(),retained.groupCapacities());
    }
    private Workspace workspace(SubscriptionAccessPolicy.Actor a,Purpose purpose,Scope scope,int page,int size) {
        var draft=scopes.draft(a.organizationId(),purpose.name(),scope.key()).map(d->new Draft(d.getId(),d.getRevision(),d.getConfiguration()==null?null:read(d.getConfiguration(),Policy.class),d.getCatalogHash(),d.getUpdatedAt(),d.getEditorState()==null?null:read(d.getEditorState(),BaselinePolicyEditor.Progress.class))).orElse(null);
        return new Workspace(scope,draft,scopes.active(a.organizationId(),purpose.name(),scope.key()).map(this::version).orElse(null),revision(a,purpose,scope.key()),
                scopes.versions(a.organizationId(),purpose.name(),scope.key(),PageRequest.of(page,size)).stream().map(this::version).toList(),scopes.versionCount(a.organizationId(),purpose.name(),scope.key()),
                purpose==Purpose.BASELINE?editor.capacities(a.organizationId(),scope):List.of(),maximum,
                scopes.abandoned(a.organizationId(),purpose.name(),scope.key(),PageRequest.of(page,size)).stream().map(d->new AbandonedDraft(d.getId(),d.getRevision(),
                        d.getConfiguration()==null?null:read(d.getConfiguration(),Policy.class),d.getCatalogHash(),d.getUpdatedAt(),
                        d.getEditorState()==null?null:read(d.getEditorState(),BaselinePolicyEditor.Progress.class),d.getAbandonedAt())).toList(),
                scopes.abandonedCount(a.organizationId(),purpose.name(),scope.key()),purpose==Purpose.SKILL_ASSESSMENT?groupCapacities(a.organizationId(),scope):List.of());
    }
    private List<GroupCapacity> groupCapacities(UUID organization,Scope scope) {
        var result=new ArrayList<GroupCapacity>();
        for(var group:scope.groups()) {
            var need=group.requirement();
            var pool=bank.eligible(organization,need.skillId(),need.knowledgeLevel().name(),group.skillVersion(),maximum+1);
            int mandatory=(int)pool.stream().filter(AssessmentItemKnowledgeMappingJpaRepository.Candidate::getMandatory).count();
            int minimum=mandatory;
            result.add(new GroupCapacity(need.skillId(),need.knowledgeLevel(),Math.max(1,minimum),
                    pool.size()<=maximum?Math.min(500,pool.size()):0,mandatory));
        }
        return List.copyOf(result);
    }
    private Version version(AssessmentRulePolicyEntity row) {
        var config=read(row.getConfiguration(),Policy.class);
        if(!RoleBaselineFlow.hash(row.getHashDomain()+"\n"+row.getPurpose()+"\n"+write(config)).equals(row.getConfigurationHash()))throw new Failure(503,"POLICY_INTEGRITY_FAILURE");
        return new Version(row.getId(),row.getVersion(),config,row.getCatalogHash(),row.getCreatedAt());
    }
    private void validate(Scope scope,Policy policy) {
        if(scope.groups().isEmpty())throw new Failure(422,"SCOPE_REQUIREMENTS_NOT_READY");
        var keys=scope.groups().stream().map(g->g.requirement().key()).collect(java.util.stream.Collectors.toSet());
        if(!keys.equals(policy.groups().stream().map(GroupRule::key).collect(java.util.stream.Collectors.toSet())))throw new Failure(422,"EXACT_SCOPE_GROUPS_REQUIRED");
        if(scope.purpose()==Purpose.BASELINE && policy.groups().stream().anyMatch(GroupRule::allWrongVeto))throw new Failure(422,"BASELINE_VETO_NOT_APPLICABLE");
    }
    private void readiness(SubscriptionAccessPolicy.Actor a,Scope scope,Policy policy) {
        if(!scope.ready())throw new Failure(422,"SCOPE_REQUIREMENTS_NOT_READY");
        int total=0;
        for(var group:scope.groups()) {
            var rule=policy.require(group.requirement().assessmentRequirement());total+=rule.totalCount();if(total>maximum)throw new Failure(422,"PAPER_CAPACITY_EXCEEDED");
            var pool=bank.eligible(a.organizationId(),group.requirement().skillId(),group.requirement().knowledgeLevel().name(),group.skillVersion(),maximum+1);
            long mandatory=scope.purpose()==Purpose.BASELINE?0:pool.stream().filter(AssessmentItemKnowledgeMappingJpaRepository.Candidate::getMandatory).count();
            if(pool.size()>maximum)throw new Failure(422,"BANK_QUERY_LIMIT_EXCEEDED");
            long minimum=mandatory;
            if(pool.size()<rule.totalCount() || minimum>rule.totalCount())throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");
        }
    }
    private Scope require(SubscriptionAccessPolicy.Actor a,Purpose purpose,String key) {
        if(key==null || !key.matches("[0-9a-f]{64}"))throw new Failure(400,"INVALID_REQUEST");
        return catalog.discoverForEditor(a.organizationId(),purpose,a.accountId()).scopes().stream().filter(s->s.key().equals(key)).findFirst().orElseThrow(()->new Failure(404,"CONFIGURATION_SCOPE_NOT_FOUND"));
    }
    private static Choice choice(Scope s){return new Choice(s.key(),s.ownerId(),s.ownerName(),s.levelId(),s.levelName(),s.rank(),s.ready());}
    private long revision(SubscriptionAccessPolicy.Actor a,Purpose p,String key){return scopes.revision(a.organizationId(),p.name(),key).orElse(0L);}
    private static void current(Scope scope,String hash){if(!scope.matchesCatalog(hash))throw new Failure(409,"POLICY_CATALOG_CHANGED");}
    private static void bounds(int page,int size){if(page<0 || page>100000 || size<1 || size>100)throw new Failure(400,"INVALID_REQUEST");}
    private String write(Object value){try{return json.writeValueAsString(value);}catch(java.io.IOException invalid){throw new Failure(503,"POLICY_INTEGRITY_FAILURE");}}
    private <T>T read(String body,Class<T> type){try{return json.readValue(body,type);}catch(java.io.IOException invalid){throw new Failure(503,"POLICY_INTEGRITY_FAILURE");}}
}
