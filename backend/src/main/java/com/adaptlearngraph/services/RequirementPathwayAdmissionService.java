package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.*;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.entities.domain.RuleAssessment;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.data.domain.PageRequest;

/** Initial requirements from the selected Role/Level and actual diagnostics only. No prerequisite closure or numeric optimizer. */
public final class RequirementPathwayAdmissionService {
    public static final String VERSION="REQUIREMENT_PATHWAY_V1";
    public record Binding(String roleId,String roleName,String levelId,String levelName,String jobPositionId,String catalogFingerprint) {}
    public record Baseline(UUID attemptId,UUID policyId,String policyHash,String finishedAt,Map<String,Boolean> passed) {
        public Baseline {passed=Collections.unmodifiableMap(new TreeMap<>(passed));}
    }
    public record Carried(UUID bypassId,Requirement requirement,String reason,List<AssessedSource> assessedSources) {
        public Carried(UUID bypassId,Requirement requirement,String reason){this(bypassId,requirement,reason,List.of());}
        public Carried {assessedSources=assessedSources==null?List.of():List.copyOf(assessedSources);}
    }
    public record Input(Binding binding,RoleBaselineFlow.Role roleSnapshot,RulePathwayCatalog.Snapshot catalog,List<Requirement> target,List<Requirement> required,Map<String,UUID> official,Baseline baseline,List<Carried> parallel) {
        public Input {target=List.copyOf(target);required=List.copyOf(required);official=Collections.unmodifiableMap(new TreeMap<>(official));parallel=List.copyOf(parallel);}
    }
    public record Frozen(String flowVersion,UUID selectionId,long selectionRevision,String planningHash,Input input) {}
    public record Preview(UUID selectionId,long selectionRevision,String roleId,String levelId,String inputHash,boolean baselineRequired,
            List<Requirement> required,int parallelCount,UUID currentRequestId) {public Preview {required=List.copyOf(required);}}
    public record Confirm(String roleId,String levelId,UUID expectedSelectionId,long expectedSelectionRevision,String expectedInputHash) {}
    public record Accepted(UUID requestId,UUID selectionId,long selectionRevision,String planningInputHash,String displayState) {}
    private record Prepared(RoleBaselineFlow.Selection selection,Input input,String hash,boolean baselineRequired) {}
    private final Actors actors;private final RoleBaselineFlow.Catalog roles;private final CurrentRoleSelectionStore selections;
    private final RulePathwayCatalog catalog;private final RequirementPathwayJpaRepository rules;private final InitialPathwayRepositories data;
    private final PathwayRequirementSnapshotJpaRepository snapshots;private final RuleAssessmentAttemptJpaRepository attempts;
    private final RuleAssessmentOutcomeJpaRepository groups;private final Receipts receipts;private final RequirementPathwayRevisions revisions;private final ObjectMapper json;
    public RequirementPathwayAdmissionService(Actors actors,RoleBaselineFlow.Catalog roles,CurrentRoleSelectionStore selections,RulePathwayCatalog catalog,
            RequirementPathwayJpaRepository rules,InitialPathwayRepositories data,PathwayRequirementSnapshotJpaRepository snapshots,
            RuleAssessmentAttemptJpaRepository attempts,RuleAssessmentOutcomeJpaRepository groups,Receipts receipts,RequirementPathwayRevisions revisions,ObjectMapper json) {
        this.actors=actors;this.roles=roles;this.selections=selections;this.catalog=catalog;this.rules=rules;this.data=data;this.snapshots=snapshots;
        this.attempts=attempts;this.groups=groups;this.receipts=receipts;this.revisions=revisions;this.json=json;
    }
    private Actor employee(){var actor=actors.require();actor.require(Role.EMPLOYEE);return actor;}
    private RoleBaselineFlow.Actor owner(Actor actor){return new RoleBaselineFlow.Actor(actor.organizationId(),actor.accountId());}
    private void reauthorize(Actor actor){if(!actor.equals(employee()))throw new Failure(403,"FORBIDDEN");}
    public record Overview(UUID selectionId,long selectionRevision,List<Requirement> target,List<String> achievedKeys,List<String> baselinePassedKeys) {}
    /** Read-only projection using the bound target snapshot and the same compatible official evidence query as planning. */
    public Overview overview() {
        var actor=employee();
            reauthorize(actor);
            var selected=selections.current(owner(actor)).orElseThrow(()->new Failure(409,"SELECTION_REQUIRED"));
            var bound=current(actor).filter(row->row.getSelectionId().equals(selected.selectionId()) && row.getSelectionRevision()==selected.revision());
            var input=bound.isPresent()?decode(bound.get()).input():prepare(actor,selected.role().id(),selected.levelId()).input();
            var plan=bound.map(revisions::read);
            var target=input.target().stream().map(requirement->requirement.provision()!=Provision.UNCONFIGURED?requirement:
                    plan.stream().flatMap(value->value.steps().stream()).map(Step::requirement)
                            .filter(value->value.key().equals(requirement.key())).findFirst().orElse(requirement)).toList();
            var achieved=new TreeSet<String>();
            rules.official(actor.organizationId(),actor.accountId(),revisions.encode(target)).forEach(row->{
                var proof=read(row.getRequirementSnapshot(),Requirement.class);
                target.stream().filter(requirement->requirement.proofKey().equals(proof.proofKey())).forEach(requirement->achieved.add(requirement.key()));
            });
            var baseline=input.baseline()==null?List.<String>of():input.baseline().passed().entrySet().stream()
                    .filter(entry->Boolean.TRUE.equals(entry.getValue())).map(Map.Entry::getKey).sorted().toList();
            reauthorize(actor);
            var latest=selections.current(owner(actor)).orElseThrow(()->new Failure(409,"STALE_SELECTION"));
            if(!latest.selectionId().equals(selected.selectionId()) || latest.revision()!=selected.revision())throw new Failure(409,"STALE_SELECTION");
            return new Overview(selected.selectionId(),selected.revision(),List.copyOf(target),List.copyOf(achieved),baseline);
    }
    public Preview preview(String roleId,String levelId) {
        var actor=employee();return selections.transaction(owner(actor),()->{
            reauthorize(actor);var prepared=prepare(actor,roleId,levelId);var open=current(actor);
            return new Preview(prepared.selection().selectionId(),prepared.selection().revision(),roleId,levelId,prepared.hash(),prepared.baselineRequired(),
                    prepared.input().required(),prepared.input().parallel().size(),open.map(RequirementPathwayJpaRepository.Row::getRequestId).orElse(null));
        });
    }
    public Receipt confirm(String key,Confirm command) {
        var actor=employee();InitialPathwayPorts.commandKey(key);
        if(command==null || command.expectedSelectionId()==null || command.expectedSelectionRevision()<1 || command.expectedInputHash()==null
                || !command.expectedInputHash().matches("[0-9a-f]{64}"))throw new Failure(400,"INVALID_REQUEST");
        InitialPathwayPorts.text(command.roleId());InitialPathwayPorts.text(command.levelId());
        String hash=RoleBaselineFlow.hash(revisions.encode(command));
        return selections.transaction(owner(actor),()->{
            reauthorize(actor);var retained=receipts.find(actor,"RULE_CONFIRM","ROLE_CONFIRMATION",key);
            if(retained.isPresent()) {if(!hash.equals(retained.get().bodyHash()))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return retained.get();}
            var selected=selection(actor,command.roleId(),command.levelId());
            if(!selected.selectionId().equals(command.expectedSelectionId()) || selected.revision()!=command.expectedSelectionRevision())throw new Failure(409,"STALE_SELECTION");
            var open=current(actor);
            if(open.isPresent()) {
                var existing=open.get();if(!existing.getSelectionId().equals(selected.selectionId()) || existing.getSelectionRevision()!=selected.revision())throw new Failure(409,"TARGET_PATHWAY_BOUND");
                return retain(actor,key,hash,existing);
            }
            if(selections.assessmentActive(owner(actor)))throw new Failure(409,"ASSESSMENT_IN_PROGRESS");
            var prepared=prepare(actor,command.roleId(),command.levelId());
            reauthorize(actor);
            if(!prepared.hash().equals(command.expectedInputHash()))throw new Failure(409,"STALE_REQUIREMENT_INPUT");
            if(prepared.baselineRequired())throw new Failure(409,"BASELINE_REQUIRED");
            // Existing owner serialization precedes every archive/write; a new accepted request immediately binds both target fields.
            if(!data.current().lockOpen(actor.organizationId(),actor.accountId()).isEmpty())throw new Failure(409,"TARGET_PATHWAY_BOUND");
            UUID id=UUID.randomUUID(),snapshot=UUID.randomUUID();var now=attempts.clock();
            var frozen=new Frozen("REQUIREMENT_V1",selected.selectionId(),selected.revision(),prepared.hash(),prepared.input());
            snapshots.insert(new PathwayRequirementSnapshotEntity(snapshot,actor.organizationId(),actor.accountId(),selected.selectionId(),selected.revision(),prepared.hash(),revisions.encode(prepared.input()),now));
            data.requests().insert(InitialPathwayRequestEntity.rule(id,actor.organizationId(),actor.accountId(),selected.selectionId(),selected.revision(),snapshot,
                    prepared.hash(),revisions.encode(frozen),VERSION));
            data.current().insert(new InitialPathwayCurrentEntity(id,actor.organizationId(),actor.accountId(),selected.selectionId(),selected.revision(),null,"NONE",null));
            var accepted=rules.own(actor.organizationId(),actor.accountId(),id).orElseThrow(()->new Failure(503,"REQUEST_WRITE_INCOMPLETE"));
            revisions.event(accepted,0,"RULE_PATHWAY_REQUESTED",actor.accountId(),Map.of("planningInputHash",prepared.hash()));
            return retain(actor,key,hash,accepted);
        });
    }
    private Receipt retain(Actor actor,String key,String hash,RequirementPathwayJpaRepository.Row row) {
        var response=new Accepted(row.getRequestId(),row.getSelectionId(),row.getSelectionRevision(),row.getPlanningInputHash(),row.getCurrentRevision()==null?row.getGenerationStatus():row.getReviewStatus());
        var receipt=new Receipt(202,hash,revisions.encode(response));receipts.save(actor,"RULE_CONFIRM","ROLE_CONFIRMATION",key,receipt);return receipt;
    }
    /** Explicit repair grants another bounded worker budget; neither request input nor total attempt/run history is reset. */
    public Receipt retry(UUID id,String key) {
        var actor=employee();InitialPathwayPorts.commandKey(key);String hash=RoleBaselineFlow.hash(id.toString());
        return selections.transaction(owner(actor),()->{
            reauthorize(actor);var retained=receipts.find(actor,"RULE_GENERATION_RETRY","PATHWAY_REPAIR",key);
            if(retained.isPresent()){if(!hash.equals(retained.get().bodyHash()))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return retained.get();}
            var row=rules.own(actor.organizationId(),actor.accountId(),id).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
            row=rules.lock(actor.organizationId(),id).orElseThrow();
            var selected=selections.current(owner(actor)).orElseThrow(()->new Failure(409,"SELECTION_REQUIRED"));
            if(!selected.selectionId().equals(row.getSelectionId()) || selected.revision()!=row.getSelectionRevision())throw new Failure(409,"TARGET_SELECTION_CHANGED");
            if(rules.requestRetry(actor.organizationId(),actor.accountId(),id)!=1)throw new Failure(409,"GENERATION_RETRY_NOT_AVAILABLE");
            int attempts=rules.attempts(actor.organizationId(),actor.accountId(),id).orElseThrow();
            revisions.event(row,attempts,"RULE_PATHWAY_GENERATION_RETRY_REQUESTED",actor.accountId(),Map.of("generationAttempt",attempts));
            var result=new Receipt(202,hash,revisions.encode(Map.of("requestId",id,"displayState","PENDING")));
            receipts.save(actor,"RULE_GENERATION_RETRY","PATHWAY_REPAIR",key,result);return result;
        });
    }
    private Optional<RequirementPathwayJpaRepository.Row> current(Actor actor) {
        var open=rules.current(actor.organizationId(),actor.accountId());if(open.size()>1)throw new Failure(503,"AMBIGUOUS_CURRENT_PATHWAY");return open.stream().findFirst();
    }
    private RoleBaselineFlow.Selection selection(Actor actor,String role,String level) {
        var selection=selections.current(owner(actor)).orElseThrow(()->new Failure(409,"SELECTION_REQUIRED"));
        if(!selection.role().id().equals(role) || !Objects.equals(selection.levelId(),level))throw new Failure(409,"STALE_SELECTION");return selection;
    }
    private Prepared prepare(Actor actor,String roleId,String levelId) {
        var selection=selection(actor,roleId,levelId);
        var role=roles.roles(actor.organizationId()).stream().filter(item->item.id().equals(roleId)).findFirst().orElseThrow(()->new Failure(404,"ROLE_NOT_AVAILABLE"));
        var level=role.levels().stream().filter(item->item.id().equals(levelId)).findFirst().orElseThrow(()->new Failure(409,"LEVEL_REQUIRED"));
        var carried=rules.carried(actor.organizationId(),actor.accountId(),selection.selectionId());
        if(carried.size()>1000)throw new Failure(422,"PARALLEL_REQUIREMENT_CAPACITY");
        var parallel=new ArrayList<>(carried.stream().map(row->new Carried(row.getBypassId(),read(row.getRequirementSnapshot(),Requirement.class),row.getReason())).toList());
        var discovered=rules.parallelNeeds(actor.organizationId(),actor.accountId());
        if(discovered.size()>1000)throw new Failure(422,"PARALLEL_REQUIREMENT_CAPACITY");
        for(var row:discovered) {
            var requirement=read(row.getRequirementSnapshot(),Requirement.class);
            if(parallel.stream().noneMatch(item->item.bypassId().equals(row.getBypassId()) && item.requirement().key().equals(requirement.key())))
                parallel.add(new Carried(row.getBypassId(),requirement,row.getReason(),List.of(new AssessedSource(row.getAttemptId(),row.getGroupId(),row.getDependentStepId(),row.getSourceRequestId()))));
        }
        if(parallel.size()>1000)throw new Failure(422,"PARALLEL_REQUIREMENT_CAPACITY");
        var snapshot=catalog.resolve(owner(actor),role,levelId,parallel.stream().map(Carried::requirement).toList());
        var selectedKeys=new HashSet<String>();for(var skill:level.skills())for(var knowledge:skill.requiredKnowledgeLevels())selectedKeys.add(skill.id()+"\n"+knowledge);
        var selected=snapshot.requirements().stream().filter(requirement->selectedKeys.contains(requirement.key())).toList();
        var official=new TreeMap<String,UUID>();
        var lookups=new ArrayList<>(selected);parallel.forEach(item->lookups.add(item.requirement()));
        rules.official(actor.organizationId(),actor.accountId(),revisions.encode(lookups)).forEach(row->official.put(read(row.getRequirementSnapshot(),Requirement.class).proofKey(),row.getEvidenceId()));
        Baseline baseline=null;var passed=new TreeMap<String,Boolean>();
        var prior=attempts.baselineForSelection(actor.organizationId(),actor.accountId(),selection.selectionId(),selection.revision(),PageRequest.of(0,1));
        if(!prior.isEmpty()) {
            var attempt=prior.getFirst();var context=readTree(attempt.getContextSnapshot()).path("context");
            if(role.fingerprint().equals(context.path("catalogFingerprint").asText())) {
                var definitions=new HashMap<String,com.fasterxml.jackson.databind.JsonNode>();
                for(var definition:context.path("requirements")) {
                    var requirement=json.convertValue(definition.path("requirement"),RuleAssessment.Requirement.class);definitions.put(requirement.key(),definition);
                }
                for(var result:groups.groups(actor.organizationId(),actor.accountId(),attempt.getId())) {
                    String pair=result.getSkillId()+"\n"+result.getKnowledgeLevel();var definition=definitions.get(pair);
                    var current=selected.stream().filter(requirement->requirement.key().equals(pair)).findFirst();
                    if(!"TARGET".equals(result.getRole()) || current.isEmpty() || definition==null)continue;
                    var pinned=json.convertValue(definition.path("requirement"),RuleAssessment.Requirement.class);
                    if(Objects.equals(current.get().skillVersion(),definition.path("skillVersion").asText()) && new HashSet<>(current.get().outcomeCodes()).equals(new HashSet<>(pinned.outcomeCodes())))passed.put(pair,result.getPassed());
                }
            }
            baseline=new Baseline(attempt.getId(),attempt.getPolicyId(),attempt.getPolicyHash(),attempt.getFinishedAt().toString(),passed);
        }
        boolean baselineRequired=false;var needs=new ArrayList<Requirement>();
        for(var requirement:selected) {
            if(official.containsKey(requirement.proofKey()))continue;
            if(requirement.provision()==Provision.MODULE_ONLY) {
                if(!passed.containsKey(requirement.key()))baselineRequired=true;
                if(Boolean.TRUE.equals(passed.get(requirement.key())))continue;
            }
            needs.add(requirement);
        }
        var input=new Input(new Binding(roleId,role.name(),levelId,level.name(),role.jobPositionId(),role.fingerprint()),role,snapshot,selected,needs,official,baseline,parallel);
        String hash=RoleBaselineFlow.hash(revisions.encode(Arrays.asList(selection.selectionId(),selection.revision(),input)));
        return new Prepared(selection,input,hash,baselineRequired);
    }
    public Frozen decode(RequirementPathwayJpaRepository.Row row) {
        var frozen=read(row.getFrozenInput(),Frozen.class);
        if(!Objects.equals(row.getFlowVersion(),frozen.flowVersion()) || !row.getSelectionId().equals(frozen.selectionId()) || row.getSelectionRevision()!=frozen.selectionRevision()
                || !row.getPlanningInputHash().equals(frozen.planningHash()) || !frozen.planningHash().equals(RoleBaselineFlow.hash(revisions.encode(Arrays.asList(frozen.selectionId(),frozen.selectionRevision(),frozen.input())))))
            throw new Failure(503,"REQUIREMENT_SNAPSHOT_INTEGRITY_FAILURE");
        return frozen;
    }
    private <T>T read(String value,Class<T> type){try{return json.readValue(value,type);}catch(Exception invalid){throw new Failure(503,"REQUIREMENT_SNAPSHOT_INVALID");}}
    private com.fasterxml.jackson.databind.JsonNode readTree(String value){try{return json.readTree(value);}catch(Exception invalid){throw new Failure(503,"REQUIREMENT_SNAPSHOT_INVALID");}}
}
