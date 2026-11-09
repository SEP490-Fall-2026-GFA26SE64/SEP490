package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.EmployeeRoleSelectionEntity;
import com.adaptlearngraph.entities.EmployeeRoleSelectionRequestEntity;
import com.adaptlearngraph.entities.OutboxEventEntity;
import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.transaction.support.TransactionTemplate;

/** Current string-ID selection namespace; legacy UUID records remain historical only in demo routing. */
public final class CurrentRoleSelectionStore implements Store {
    private final RoleSelectionRepositories data; private final ObjectMapper json; private final TransactionTemplate tx;
    public CurrentRoleSelectionStore(RoleSelectionRepositories data, ObjectMapper json, TransactionTemplate tx) {
        this.data=data; this.json=json; this.tx=tx;
    }
    private record Snapshot(int snapshotVersion,Role role,String levelId) {}
    @Override public <T> T transaction(Actor a, java.util.function.Supplier<T> work) {
        return tx.execute(status -> {
            data.learners().insertForActiveAccount(a.organizationId(),a.learnerId());
            data.locks().lock("AB-ATTEMPT-ACTOR-V1\n"+a.organizationId()+"\n"+a.learnerId());
            var found=data.learners().lockActive(a.organizationId(),a.learnerId());
            if(found.size()!=1) throw new Failure(403,"FORBIDDEN");
            return work.get();
        });
    }
    @Override public Optional<Selection> current(Actor a) {
        return data.selections().current(a.organizationId(),a.learnerId()).stream().map(row->{
                    Snapshot snapshot=snapshot(row.roleSnapshot());
                    if(!snapshot.role().id().equals(row.roleId()) || !snapshot.role().jobPositionId().equals(row.jobPositionId()))throw new IllegalStateException("Selection identity mismatch");
                    return new Selection(row.selectionId(),snapshot.role(),row.targetRevision(),row.selectedAt(),true,snapshot.levelId());
                }).toList()
                .stream().findFirst();
    }
    @Override public boolean hasLegacySelection(Actor a) {
        return data.legacySelections().hasOpen(a.organizationId(),a.learnerId());
    }
    @Override public Optional<Selection> replay(Actor a,String retry,String hash) {
        var rows=data.requests().find(a.organizationId(),a.learnerId(),retry).stream().map(row-> {
                    if(!hash.equals(row.requestHash())) throw new Failure(409,"IDEMPOTENCY_CONFLICT");
                    return read(row.response(),Selection.class);
                }).toList();
        return rows.stream().findFirst();
    }
    @Override public boolean assessmentActive(Actor a) {
        return data.selections().assessmentInProgress(a.organizationId(),a.learnerId());
    }
    @Override public Selection select(Actor a,Role role,String retry,String hash) {
        return select(a,role,current(a).filter(s->s.role().id().equals(role.id())).map(Selection::levelId).orElse(null),retry,hash);
    }
    @Override public Selection select(Actor a,Role role,String levelId,String retry,String hash) {
        var selected=writeSelection(a,role,levelId);
        data.requests().insert(new EmployeeRoleSelectionRequestEntity(a.organizationId(),a.learnerId(),retry,hash,selected.selectionId(),write(selected),null));
        return selected;
    }
    /** Same owner write, called only inside transaction(); initial commands own a separate receipt namespace. */
    public Selection selectForPathway(Actor a,Role role,String levelId) {
        if(!org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive())
            throw new IllegalStateException("Initial admission must share the selection transaction");
        requireNoLegacyPath(a);
        if(levelId==null)throw new Failure(400,"LEVEL_REQUIRED");
        return writeSelection(a,role,levelId);
    }
    private void requireNoLegacyPath(Actor a) {
        if(data.legacyPathways().hasCurrent(a.learnerId()))
            throw new Failure(409,"PATHWAY_REQUIRES_OWNER");
    }
    private Selection writeSelection(Actor a,Role role,String levelId) {
        if(levelId!=null && role.levels().stream().noneMatch(l->l.id().equals(levelId)))throw new Failure(404,"LEVEL_NOT_AVAILABLE");
        var old=current(a); Selection selected;
        var now=AdaptiveAttemptRows.instant(data.learners().clock());
        if(old.filter(s->s.role().id().equals(role.id()) && Objects.equals(s.levelId(),levelId)).isPresent()) selected=old.get();
        else {
            // All selection/admission callers converge here under transaction()'s learner lock.
            // Check before archive, revision increment, selection write, audit or outbox.
            if(data.selections().targetBound(a.organizationId(),a.learnerId()))
                throw new Failure(409,"TARGET_ROLE_LEVEL_LOCKED");
            if(assessmentActive(a))throw new Failure(409,"ASSESSMENT_IN_PROGRESS");
            requireNoLegacyPath(a);
            archiveInitialPathways(a,now);
            data.selections().endCurrent(a.organizationId(),a.learnerId(),now);
            // Former UPDATE ... RETURNING: the learner_state row is locked by transaction(), so the re-read is the incremented value.
            if(data.learners().incrementTargetRevision(a.learnerId())!=1)throw new EmptyResultDataAccessException(1);
            Long revision=data.learners().targetRevision(a.learnerId()).getFirst();
            selected=new Selection(UUID.randomUUID(),role,Objects.requireNonNull(revision),now,true,levelId);
            data.selections().insert(new EmployeeRoleSelectionEntity(selected.selectionId(),a.organizationId(),a.learnerId(),role.id(),
                    role.jobPositionId(),write(new Snapshot(1,role,levelId)),revision,now,null));
            String event=old.isPresent()?"TARGET_ROLE_CHANGED":"TARGET_ROLE_SELECTED";
            var payload=new LinkedHashMap<String,Object>();
            payload.put("payloadVersion",2); payload.put("organizationId",a.organizationId()); payload.put("learnerId",a.learnerId());
            payload.put("selectionId",selected.selectionId()); payload.put("previousSelectionId",old.map(Selection::selectionId).orElse(null));
            payload.put("roleId",role.id());payload.put("jobPositionId",role.jobPositionId());payload.put("targetRevision",revision);payload.put("occurredAt",now);
            payload.put("levelId",levelId);payload.put("previousLevelId",old.map(Selection::levelId).orElse(null));
            data.outbox().insert(new OutboxEventEntity(UUID.randomUUID(),event,a.learnerId(),revision,PersistenceValues.document(write(payload)),
                    selected.selectionId(),now));
            data.audit().insert(new AuditEventEntity(UUID.randomUUID(),null,"current-target-role",event,selected.selectionId(),revision.toString(),
                    now,"SUCCEEDED",selected.selectionId()));
        }
        return selected;
    }
    private void archiveInitialPathways(Actor actor,Instant now) {
        UUID org=actor.organizationId(),learner=actor.learnerId();
        var open=data.initialCurrent().lockOpen(org,learner);
        var archived=open.isEmpty()?List.<InitialPathwayCurrentJpaRepository.Pointer>of():data.initialCurrent().pointers(org,learner,open);
        if(!open.isEmpty())data.initialCurrent().archiveAt(org,learner,open,now);
        data.initialRequests().staleLearner(org,learner,"SELECTION_CHANGED");
        for(var path:archived) {
            long revision=path.currentRevision()==null?0:path.currentRevision();
            var payload=write(Map.of("payloadVersion",1,"organizationId",org,"learnerId",learner,"pathwayId",path.requestId(),"reason","SELECTION_CHANGED"));
            data.outbox().insert(new OutboxEventEntity(UUID.randomUUID(),"INITIAL_PATHWAY_ARCHIVED",path.requestId(),revision,
                    PersistenceValues.document(payload),path.requestId(),now));
            data.audit().insert(new AuditEventEntity(UUID.randomUUID(),null,"current-target-role","INITIAL_PATHWAY_ARCHIVED",path.requestId(),
                    Long.toString(revision),now,"SUCCEEDED",path.requestId()));
        }
    }
    private String write(Object value) { try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Selection serialization failed",e);} }
    private Snapshot snapshot(String value) {
        try {
            var tree=json.readTree(value);
            Snapshot result=tree.has("snapshotVersion")?json.treeToValue(tree,Snapshot.class):new Snapshot(1,json.treeToValue(tree,Role.class),null);
            if(result.snapshotVersion()!=1 || result.role()==null || result.levelId()!=null && result.role().levels().stream().noneMatch(l->l.id().equals(result.levelId())))throw new IllegalStateException("Selection snapshot invalid");
            return result;
        }catch(Exception invalid){throw new IllegalStateException("Selection snapshot invalid",invalid);}
    }
    private <T>T read(String value,Class<T> type) { try{return json.readValue(value,type);}catch(Exception e){throw new IllegalStateException("Selection snapshot invalid",e);} }
}
