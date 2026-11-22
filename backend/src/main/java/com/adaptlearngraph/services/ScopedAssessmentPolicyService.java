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
    public record Statistics(long total,long active,long needsConfiguration) {}
    public record Directory(List<Row> rows,long total,List<Choice> choices,List<com.adaptlearngraph.entities.domain.AssessmentPolicyScope.Issue> issues,Statistics statistics) {}
    public record Draft(UUID id,long revision,Policy configuration,String catalogHash,Instant updatedAt,BaselinePolicyEditor.Progress editorState) {}
    public record Version(UUID id,long version,Policy configuration,String catalogHash,Instant createdAt) {}
    public record AbandonedDraft(UUID id,long revision,Policy configuration,String catalogHash,Instant updatedAt,
                                 BaselinePolicyEditor.Progress editorState,Instant abandonedAt) {}
    public record GroupCapacity(String skillId,com.adaptlearngraph.entities.domain.KnowledgeLevel knowledgeLevel,int minQuestions,int maxQuestions,int mandatoryQuestions,int ordinaryQuestions) {}
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
    public record SaveEditor(UUID commandKey,UUID draftId,long expectedRevision,String expectedCatalogHash,BaselinePolicyEditor.Progress editorState,long expectedActivationRevision) {
        public SaveEditor(UUID commandKey,UUID draftId,long expectedRevision,String expectedCatalogHash,BaselinePolicyEditor.Progress editorState) {this(commandKey,draftId,expectedRevision,expectedCatalogHash,editorState,0);}
    }
    public record Activate(UUID commandKey,UUID draftId,long expectedRevision,long expectedActivationRevision,String expectedCatalogHash) {}
    public record Complete(UUID commandKey,UUID draftId,long expectedRevision,long expectedActivationRevision,String expectedCatalogHash,BaselinePolicyEditor.Progress editorState) {}
    public record Abandon(UUID commandKey,UUID draftId,long expectedRevision) {}
    public record BulkRule(int totalCount,int requiredCorrectCount,int mandatoryCount,boolean allWrongVeto) {}
    public record BulkTemplate(BulkRule main,BulkRule foundations,BulkRule prerequisites,int secondsPerQuestion,int maxAttempts,int retakeWaitSeconds) {}
    public record BulkPreview(List<String> keys,BulkTemplate template,boolean replaceExisting) {}
    public record BulkRow(Workspace workspace,Policy configuration,List<String> issues) {}
    public record BulkEntry(String key,String catalogHash,long activationRevision,UUID draftId,long draftRevision,Policy configuration) {}
    public record BulkSave(UUID commandKey,boolean activate,boolean replaceExisting,List<BulkEntry> entries) {}
    public record BulkResult(String key,String status,String error) {}
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
    // HTTP scalars are converted here, keeping domain enums out of controller signatures.
    public void authorizeHttp(String purpose){authorize(Purpose.valueOf(purpose));}
    public Directory directoryHttp(String purpose,String search,String owner,String level,String status,int page,int size){return directory(Purpose.valueOf(purpose),search,owner,level,status,page,size);}
    public Workspace readHttp(String purpose,String key,int page,int size){return read(Purpose.valueOf(purpose),key,page,size);}
    public Workspace createHttp(String purpose,String key,Create command){return create(Purpose.valueOf(purpose),key,command);}
    public Workspace saveHttp(String purpose,String key,Save command){return save(Purpose.valueOf(purpose),key,command);}
    public Workspace saveEditorHttp(String purpose,String key,SaveEditor command){return saveEditor(Purpose.valueOf(purpose),key,command);}
    public Workspace activateHttp(String purpose,String key,Activate command){return activate(Purpose.valueOf(purpose),key,command);}
    public Workspace completeHttp(String purpose,String key,Complete command){return complete(Purpose.valueOf(purpose),key,command);}
    public Workspace abandonHttp(String purpose,String key,Abandon command){return abandon(Purpose.valueOf(purpose),key,command);}
    public void authorize(Purpose purpose){actor(purpose);}
    public List<BulkRow> previewBulk(BulkPreview command) {
        var a=actor(Purpose.SKILL_ASSESSMENT);
        if(command==null || command.keys()==null || command.keys().isEmpty() || command.keys().size()>300
                || new HashSet<>(command.keys()).size()!=command.keys().size() || command.template()==null)throw new Failure(400,"INVALID_REQUEST");
        var template=command.template();
        if(template.secondsPerQuestion()<1 || template.maxAttempts()<1 || template.retakeWaitSeconds()<0)throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
        return locked(a,Purpose.SKILL_ASSESSMENT,()->{
            var result=new ArrayList<BulkRow>();
            for(var key:command.keys()) {
                var scope=require(a,Purpose.SKILL_ASSESSMENT,key);var workspace=workspace(a,Purpose.SKILL_ASSESSMENT,scope,0,20);
                var issues=new ArrayList<String>();Policy configuration=null;
                if(!command.replaceExisting() && (workspace.active()!=null || workspace.draft()!=null))issues.add("EXISTING_POLICY_SKIPPED");
                try {
                    var groups=scope.groups().stream().map(group->{
                        var need=group.requirement();var rule=need.skillId().equals(scope.ownerId())
                                ?(need.knowledgeLevel().name().equals(scope.levelId())?template.main():template.foundations()):template.prerequisites();
                        return new GroupRule(need.skillId(),need.knowledgeLevel(),rule.totalCount(),rule.requiredCorrectCount(),rule.mandatoryCount()>0,
                                !need.skillId().equals(scope.ownerId()) && rule.allWrongVeto(),rule.mandatoryCount());
                    }).toList();
                    int total=groups.stream().mapToInt(GroupRule::totalCount).sum();
                    configuration=new Policy(Math.multiplyExact(template.secondsPerQuestion(),total),template.retakeWaitSeconds(),template.maxAttempts(),groups);
                    validate(scope,configuration);readiness(a,scope,configuration);
                }catch(Failure failure){issues.add(failure.code);}catch(IllegalArgumentException|ArithmeticException invalid){issues.add("POLICY_CONFIGURATION_REQUIRED");}
                result.add(new BulkRow(workspace,configuration,List.copyOf(issues)));
            }
            return List.copyOf(result);
        });
    }
    /** Each scope has its own transaction and immutable command receipts. A retry reuses action keys. */
    public List<BulkResult> saveBulk(BulkSave command) {
        actor(Purpose.SKILL_ASSESSMENT);
        if(command==null || command.commandKey()==null || command.entries()==null || command.entries().isEmpty() || command.entries().size()>300
                || command.entries().stream().map(BulkEntry::key).distinct().count()!=command.entries().size())throw new Failure(400,"INVALID_REQUEST");
        var result=new ArrayList<BulkResult>();
        for(var entry:command.entries())try {
            var a=actor(Purpose.SKILL_ASSESSMENT);
            var saved=locked(a,Purpose.SKILL_ASSESSMENT,()->{
                var scope=require(a,Purpose.SKILL_ASSESSMENT,entry.key());current(scope,entry.catalogHash());
                String operation="BULK_SKILL_POLICY",resource=entry.key();
                UUID retry=UUID.nameUUIDFromBytes((command.commandKey()+":"+resource).getBytes(java.nio.charset.StandardCharsets.UTF_8));
                String hash=RoleBaselineFlow.hash(write(Arrays.asList(entry,command.activate(),command.replaceExisting())));
                var receipt=policies.receipt(a.organizationId(),a.accountId(),operation,resource,retry);
                if(receipt.isPresent()) {
                    if(!receipt.get().getHash().equals(hash))throw new Failure(409,"IDEMPOTENCY_CONFLICT");
                    return read(receipt.get().getOutcome(),BulkResult.class);
                }
                var w=workspace(a,Purpose.SKILL_ASSESSMENT,scope,0,20);
                if(!command.replaceExisting() && (w.active()!=null || w.draft()!=null))throw new Failure(409,"EXISTING_POLICY_SKIPPED");
                if(w.activationRevision()!=entry.activationRevision() || !Objects.equals(w.draft()==null?null:w.draft().id(),entry.draftId())
                        || (w.draft()==null?0:w.draft().revision())!=entry.draftRevision())throw new Failure(409,"STALE_POLICY_DRAFT");
                validate(scope,entry.configuration());readiness(a,scope,entry.configuration());
                UUID draft=w.draft()==null?UUID.randomUUID():w.draft().id();long revision=w.draft()==null?1:w.draft().revision();
                if(w.draft()==null && scopes.create(a.organizationId(),Purpose.SKILL_ASSESSMENT.name(),entry.key(),draft,null,scope.catalogHash(),a.accountId())!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
                if(scopes.update(a.organizationId(),Purpose.SKILL_ASSESSMENT.name(),entry.key(),draft,revision,write(entry.configuration()),scope.catalogHash(),a.accountId())!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
                if(command.activate())publish(a,Purpose.SKILL_ASSESSMENT,entry.key(),scope,entry.configuration(),draft,revision+1);
                current(require(a,Purpose.SKILL_ASSESSMENT,entry.key()),scope.catalogHash());
                var value=new BulkResult(entry.key(),command.activate()?"ACTIVE":"DRAFT",null);
                policies.retain(UUID.randomUUID(),a.organizationId(),a.accountId(),operation,resource,retry,hash,write(value));return value;
            });
            result.add(saved);
        }catch(Failure failure){result.add(new BulkResult(entry.key(),"FAILED",failure.code));}
        catch(org.springframework.dao.DataAccessException|IllegalStateException failure){result.add(new BulkResult(entry.key(),"FAILED","DEPENDENCY_UNAVAILABLE"));}
        return List.copyOf(result);
    }
    private <T>T locked(SubscriptionAccessPolicy.Actor a,Purpose purpose,Supplier<T> work) {
        return tx.execute(status->{
            // Retain the purpose advisory lock: it serializes same-scope publication as well as legacy callers.
            // Scoped version uniqueness is additionally enforced by the database index.
            locks.lock("ASSESSMENT-RULE-POLICY\n"+a.organizationId()+"\n"+purpose);
            if(!a.equals(actor(purpose)))throw new Failure(403,"FORBIDDEN");
            T result=work.get();if(!a.equals(actor(purpose)))throw new Failure(403,"FORBIDDEN");
            // Recheck current Role responsibility on reads and exact receipt replays too.
            if(result instanceof Workspace workspace)require(a,purpose,workspace.scope().key());
            if(result instanceof Directory directory) {
                var allowed=catalog.discoverForEditor(a.organizationId(),purpose,a.accountId()).scopes().stream()
                        .map(Scope::key).collect(java.util.stream.Collectors.toSet());
                if(directory.choices().stream().anyMatch(choice->!allowed.contains(choice.key())))throw new Failure(403,"FORBIDDEN");
            }
            return result;
        });
    }
    public Directory directory(Purpose purpose,String search,String owner,String level,String filter,int page,int size) {
        var a=actor(purpose);bounds(page,size);
        if(search.length()>200 || owner.length()>200 || level.length()>200 || !Set.of("","ALL","WORKLIST","UNCONFIGURED","DRAFT","ACTIVE","HISTORY").contains(filter)
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
                boolean legacy=purpose==Purpose.BASELINE && !scope.sharedBaseline();
                if(legacy) {if(!filter.equals("HISTORY") || s==null)continue;archived=count+abandoned+(draft?1:0);}
                String state=active?"ACTIVE":draft?"DRAFT":count>0 || abandoned>0?"HISTORY":"UNCONFIGURED";
                if(purpose==Purpose.BASELINE && !filter.equals("HISTORY") && !filter.equals("ALL") && !scope.ready())continue;
                if(!scope.ownerName().toLowerCase(Locale.ROOT).contains(query) && !scope.ownerId().toLowerCase(Locale.ROOT).contains(query))continue;
                if(!owner.isEmpty() && !scope.ownerId().equals(owner) || !level.isEmpty() && !scope.levelId().equals(level))continue;
                if(filter.equals("ALL")) {if(legacy)continue;}
                else if(filter.equals("HISTORY")) {if(archived==0)continue;}
                else if(filter.equals("WORKLIST")) {if(state.equals("HISTORY") || active && !draft)continue;}
                else if(filter.isEmpty() && state.equals("HISTORY"))continue;
                else if(!filter.isEmpty() && !(filter.equals("DRAFT")?draft:filter.equals(state)))continue;
                rows.add(new Row(choice(scope),filter.equals("HISTORY")?"HISTORY":purpose==Purpose.BASELINE && !scope.ready()?"WAITING":state,
                        draft,active?s.getActiveVersion():null,count,draft && s.getDraftIncomplete(),archived));
            }
            rows.sort(Comparator.comparingInt((Row r)->(r.hasDraft()?0:r.status().equals("UNCONFIGURED")?1:2))
                    .thenComparing(r->r.scope().ownerName(),String.CASE_INSENSITIVE_ORDER).thenComparing(r->r.scope().ownerId())
                    .thenComparingInt(r->r.scope().rank()).thenComparing(r->r.scope().levelId()).thenComparing(r->r.scope().key()));
            long total=rows.size();int start=(int)Math.min((long)page*size,total);
            var visible=all.stream().filter(scope->purpose!=Purpose.BASELINE || filter.equals("ALL") || filter.equals("HISTORY") || scope.ready()).toList();
            var visibleOwners=visible.stream().map(Scope::ownerId).collect(java.util.stream.Collectors.toSet());
            var issues=discovery.issues().stream().filter(issue->visibleOwners.contains(issue.ownerId())).filter(issue->(owner.isEmpty() || owner.equals(issue.ownerId()))
                    && (query.isEmpty() || issue.ownerName().toLowerCase(Locale.ROOT).contains(query) || issue.ownerId().toLowerCase(Locale.ROOT).contains(query))).toList();
            var managed=all.stream().filter(scope->purpose!=Purpose.BASELINE || scope.sharedBaseline()).toList();
            long activeCount=managed.stream().filter(scope->states.containsKey(scope.key()) && states.get(scope.key()).getActiveId()!=null).count();
            long needsCount=managed.stream().filter(Scope::ready).filter(scope->!states.containsKey(scope.key()) || states.get(scope.key()).getActiveId()==null || states.get(scope.key()).getDraftId()!=null).count();
            return new Directory(List.copyOf(rows.subList(start,Math.min(start+size,rows.size()))),total,visible.stream().map(ScopedAssessmentPolicyService::choice).toList(),issues,new Statistics(managed.size(),activeCount,needsCount));
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
            locks.lock("question-bank:"+a.organizationId());
            if(purpose==Purpose.BASELINE)editor.validatePolicy(a.organizationId(),scope,command.configuration());
            else for(var capacity:groupCapacities(a.organizationId(),scope)) {
                var rule=command.configuration().groups().stream().filter(g->g.skillId().equals(capacity.skillId()) && g.knowledgeLevel()==capacity.knowledgeLevel()).findFirst().orElseThrow();
                if(rule.totalCount()<capacity.minQuestions() || rule.totalCount()>capacity.maxQuestions())throw new Failure(422,"QUESTION_COUNT_OUT_OF_RANGE");
                if(rule.mandatoryCount()>capacity.mandatoryQuestions() || rule.totalCount()-rule.mandatoryCount()>capacity.ordinaryQuestions())
                    throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");
            }
            if(scopes.update(a.organizationId(),purpose.name(),key,command.draftId(),command.expectedRevision(),write(command.configuration()),scope.catalogHash(),a.accountId())!=1)
                throw new Failure(409,"STALE_POLICY_DRAFT");
        });
    }
    public Workspace saveEditor(Purpose purpose,String key,SaveEditor command) {
        var a=actor(purpose);
        if(purpose!=Purpose.BASELINE || command==null || command.expectedRevision()<0 || command.editorState()==null
                || (command.draftId()==null)!=(command.expectedRevision()==0))
            throw new Failure(400,"INVALID_REQUEST");
        return mutate(a,purpose,key,"SAVE_BASELINE_EDITOR",command.commandKey(),command,scope->{
            current(scope,command.expectedCatalogHash());
            locks.lock("question-bank:"+a.organizationId());
            var policy=editor.validate(a.organizationId(),scope,command.editorState());
            if(policy!=null)validate(scope,policy);
            UUID id=command.draftId();long expected=command.expectedRevision();
            if(id==null) {
                if(scopes.draft(a.organizationId(),purpose.name(),key).isPresent() || revision(a,purpose,key)!=command.expectedActivationRevision())throw new Failure(409,"STALE_POLICY_DRAFT");
                id=UUID.randomUUID();expected=1;
                if(scopes.create(a.organizationId(),purpose.name(),key,id,null,scope.catalogHash(),a.accountId())!=1)throw new Failure(409,"STALE_POLICY_DRAFT");
            }
            if(scopes.updateEditor(a.organizationId(),purpose.name(),key,id,expected,policy==null?null:write(policy),
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
        if(command.commandKey()==null)throw new Failure(400,"INVALID_REQUEST");
        return locked(a,purpose,()->{
            require(a,purpose,key);
            var receipt=policies.receipt(a.organizationId(),a.accountId(),"COMPLETE_AND_ACTIVATE_BASELINE",purpose+":"+key,command.commandKey());
            if(receipt.isPresent()) {
                if(!receipt.get().getHash().equals(RoleBaselineFlow.hash(write(command))))throw new Failure(409,"IDEMPOTENCY_CONFLICT");
                return replayWorkspace(a,purpose,key,read(receipt.get().getOutcome(),Workspace.class));
            }
            throw new Failure(422,"SAVE_BEFORE_ACTIVATE_REQUIRED");
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
            if(purpose==Purpose.BASELINE && !scope.sharedBaseline())throw new Failure(409,"LEGACY_BASELINE_POLICY_READ_ONLY");
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
            int minimum=1;
            result.add(new GroupCapacity(need.skillId(),need.knowledgeLevel(),Math.max(1,minimum),
                    pool.size()<=maximum?Math.min(500,pool.size()):0,mandatory,pool.size()-mandatory));
        }
        return List.copyOf(result);
    }
    private Version version(AssessmentRulePolicyEntity row) {
        var config=read(row.getConfiguration(),Policy.class);
        if(!RoleBaselineFlow.hash(row.getHashDomain()+"\n"+row.getPurpose()+"\n"+write(config)).equals(row.getConfigurationHash()))throw new Failure(503,"POLICY_INTEGRITY_FAILURE");
        return new Version(row.getId(),row.getVersion(),config,row.getCatalogHash(),row.getCreatedAt());
    }
    private void validate(Scope scope,Policy policy) {
        if(scope.purpose()==Purpose.SKILL_ASSESSMENT && policy.baselineTiming()!=null)throw new Failure(422,"INVALID_REQUEST");
        if(scope.groups().isEmpty())throw new Failure(422,"SCOPE_REQUIREMENTS_NOT_READY");
        var keys=scope.groups().stream().map(g->g.requirement().key()).collect(java.util.stream.Collectors.toSet());
        if(!keys.equals(policy.groups().stream().map(GroupRule::key).collect(java.util.stream.Collectors.toSet())))throw new Failure(422,"EXACT_SCOPE_GROUPS_REQUIRED");
        if(scope.purpose()==Purpose.BASELINE && policy.groups().stream().anyMatch(GroupRule::allWrongVeto))throw new Failure(422,"BASELINE_VETO_NOT_APPLICABLE");
        if(scope.purpose()==Purpose.SKILL_ASSESSMENT && policy.groups().stream().anyMatch(g->g.mandatoryCount()==null))
            throw new Failure(422,"MANDATORY_COUNT_REQUIRED");
    }
    private void readiness(SubscriptionAccessPolicy.Actor a,Scope scope,Policy policy) {
        locks.lock("question-bank:"+a.organizationId());
        if(!scope.ready())throw new Failure(422,"SCOPE_REQUIREMENTS_NOT_READY");
        if(scope.sharedBaseline()) {
            var missing=editor.missingBanks(a.organizationId(),scope);
            if(!missing.isEmpty())throw new Failure(422,"REQUIRED_GROUP_BANK_EMPTY",missing);
            editor.validatePolicy(a.organizationId(),scope,policy);
            for(var member:scope.memberLevels()) {
                int actual=0;
                for(var group:member.groups())actual+=policy.require(group.requirement().assessmentRequirement()).totalCount();
                if(actual>maximum)throw new Failure(422,"PAPER_CAPACITY_EXCEEDED");
                if(actual>0)try{policy.durationSeconds(actual);}catch(ArithmeticException overflow){throw new Failure(422,"ASSESSMENT_DURATION_OUT_OF_RANGE");}
            }
            return;
        }
        int total=0;
        for(var group:scope.groups()) {
            var rule=policy.require(group.requirement().assessmentRequirement());total+=rule.totalCount();if(total>maximum)throw new Failure(422,"PAPER_CAPACITY_EXCEEDED");
            var pool=bank.eligible(a.organizationId(),group.requirement().skillId(),group.requirement().knowledgeLevel().name(),group.skillVersion(),maximum+1);
            long mandatory=pool.stream().filter(AssessmentItemKnowledgeMappingJpaRepository.Candidate::getMandatory).count();
            if(pool.size()>maximum)throw new Failure(422,"BANK_QUERY_LIMIT_EXCEEDED");
            if(rule.mandatoryCount()!=null) {
                if(mandatory<rule.mandatoryCount() || pool.size()-mandatory<rule.totalCount()-rule.mandatoryCount())
                    throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");
            } else if(pool.size()<rule.totalCount() || (scope.purpose()==Purpose.SKILL_ASSESSMENT && mandatory>rule.totalCount()))
                throw new Failure(422,"INSUFFICIENT_APPROVED_GROUP_BANK");
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
