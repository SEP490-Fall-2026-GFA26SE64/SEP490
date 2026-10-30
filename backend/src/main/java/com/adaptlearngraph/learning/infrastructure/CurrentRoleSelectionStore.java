package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.RoleBaselineFlow.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Current string-ID selection namespace; legacy UUID records remain historical only in demo routing. */
public final class CurrentRoleSelectionStore implements Store {
    private final NamedParameterJdbcTemplate jdbc; private final ObjectMapper json; private final TransactionTemplate tx;
    public CurrentRoleSelectionStore(NamedParameterJdbcTemplate jdbc, ObjectMapper json, TransactionTemplate tx) {
        this.jdbc=jdbc; this.json=json; this.tx=tx;
    }
    private record Snapshot(int snapshotVersion,Role role,String levelId) {}
    private MapSqlParameterSource key(Actor a) { return new MapSqlParameterSource("org",a.organizationId()).addValue("learner",a.learnerId()); }
    @Override public <T> T transaction(Actor a, java.util.function.Supplier<T> work) {
        return tx.execute(status -> {
            jdbc.update("""
                    INSERT INTO platform.learner_state(learner_id)
                    SELECT account_id FROM platform.account WHERE account_id=:learner AND organization_id=:org AND active
                    ON CONFLICT(learner_id) DO NOTHING
                    """, key(a));
            jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(:coordination,0))",
                    Map.of("coordination","AB-ATTEMPT-ACTOR-V1\n"+a.organizationId()+"\n"+a.learnerId()),(rs,n)->true);
            var found=jdbc.query("""
                    SELECT l.learner_id FROM platform.learner_state l JOIN platform.account a ON a.account_id=l.learner_id
                    WHERE l.learner_id=:learner AND a.organization_id=:org AND a.active FOR UPDATE OF l
                    """,key(a),(rs,n)->rs.getObject(1,UUID.class));
            if(found.size()!=1) throw new Failure(403,"FORBIDDEN");
            return work.get();
        });
    }
    @Override public Optional<Selection> current(Actor a) {
        return jdbc.query("""
                SELECT * FROM platform.employee_role_selection
                WHERE organization_id=:org AND learner_id=:learner AND ended_at IS NULL
                """,key(a),(rs,n)->{
                    Snapshot snapshot=snapshot(rs.getString("role_snapshot"));
                    if(!snapshot.role().id().equals(rs.getString("role_id")) || !snapshot.role().occupationId().equals(rs.getString("occupation_id")))throw new IllegalStateException("Selection identity mismatch");
                    return new Selection(rs.getObject("selection_id",UUID.class),snapshot.role(),rs.getLong("target_revision"),rs.getTimestamp("selected_at").toInstant(),true,snapshot.levelId());
                })
                .stream().findFirst();
    }
    @Override public boolean hasLegacySelection(Actor a) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.target_selection s
                JOIN platform.account a ON a.account_id=s.learner_id
                WHERE s.learner_id=:learner AND a.organization_id=:org AND s.ended_at IS NULL)
                """, key(a), Boolean.class));
    }
    @Override public Optional<Selection> replay(Actor a,String retry,String hash) {
        var rows=jdbc.query("""
                SELECT request_hash,response FROM platform.employee_role_selection_request
                WHERE organization_id=:org AND learner_id=:learner AND retry_key=:retry
                """,key(a).addValue("retry",retry),(rs,n)-> {
                    if(!hash.equals(rs.getString(1))) throw new Failure(409,"IDEMPOTENCY_CONFLICT");
                    return read(rs.getString(2),Selection.class);
                });
        return rows.stream().findFirst();
    }
    @Override public boolean assessmentActive(Actor a) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.baseline_adaptive_attempt
                    WHERE organization_id=:org AND learner_id=:learner AND state='IN_PROGRESS')
                """,key(a),Boolean.class));
    }
    @Override public Selection select(Actor a,Role role,String retry,String hash) {
        return select(a,role,current(a).filter(s->s.role().id().equals(role.id())).map(Selection::levelId).orElse(null),retry,hash);
    }
    @Override public Selection select(Actor a,Role role,String levelId,String retry,String hash) {
        var selected=writeSelection(a,role,levelId);
        jdbc.update("""
                INSERT INTO platform.employee_role_selection_request(organization_id,learner_id,retry_key,request_hash,selection_id,response)
                VALUES(:org,:learner,:retry,:hash,:id,CAST(:response AS jsonb))
                """,key(a).addValue("retry",retry).addValue("hash",hash).addValue("id",selected.selectionId()).addValue("response",write(selected)));
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
        if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.pathway_revision WHERE learner_id=:learner AND status='PUBLISHED_CURRENT')",key(a),Boolean.class)))
            throw new Failure(409,"PATHWAY_REQUIRES_OWNER");
    }
    private Selection writeSelection(Actor a,Role role,String levelId) {
        if(levelId!=null && role.levels().stream().noneMatch(l->l.id().equals(levelId)))throw new Failure(404,"LEVEL_NOT_AVAILABLE");
        var old=current(a); Selection selected;
        var now=jdbc.queryForObject("SELECT clock_timestamp()",Map.of(),(rs,n)->rs.getTimestamp(1).toInstant());
        if(old.filter(s->s.role().id().equals(role.id()) && Objects.equals(s.levelId(),levelId)).isPresent()) selected=old.get();
        else {
            requireNoLegacyPath(a);
            archiveInitialPathways(a,now);
            jdbc.update("UPDATE platform.employee_role_selection SET ended_at=:time WHERE organization_id=:org AND learner_id=:learner AND ended_at IS NULL",key(a).addValue("time",Timestamp.from(now)));
            Long revision=jdbc.queryForObject("UPDATE platform.learner_state SET target_revision=target_revision+1 WHERE learner_id=:learner RETURNING target_revision",key(a),Long.class);
            selected=new Selection(UUID.randomUUID(),role,Objects.requireNonNull(revision),now,true,levelId);
            jdbc.update("""
                    INSERT INTO platform.employee_role_selection(selection_id,organization_id,learner_id,role_id,occupation_id,role_snapshot,target_revision,selected_at)
                    VALUES(:id,:org,:learner,:role,:occupation,CAST(:snapshot AS jsonb),:revision,:time)
                    """,key(a).addValue("id",selected.selectionId()).addValue("role",role.id()).addValue("occupation",role.occupationId())
                    .addValue("snapshot",write(new Snapshot(1,role,levelId))).addValue("revision",revision).addValue("time",Timestamp.from(now)));
            String event=old.isPresent()?"TARGET_ROLE_CHANGED":"TARGET_ROLE_SELECTED";
            var payload=new LinkedHashMap<String,Object>();
            payload.put("payloadVersion",2); payload.put("organizationId",a.organizationId()); payload.put("learnerId",a.learnerId());
            payload.put("selectionId",selected.selectionId()); payload.put("previousSelectionId",old.map(Selection::selectionId).orElse(null));
            payload.put("roleId",role.id());payload.put("occupationId",role.occupationId());payload.put("targetRevision",revision);payload.put("occurredAt",now);
            payload.put("levelId",levelId);payload.put("previousLevelId",old.map(Selection::levelId).orElse(null));
            var params=key(a).addValue("event",UUID.randomUUID()).addValue("type",event).addValue("revision",revision)
                    .addValue("id",selected.selectionId()).addValue("payload",write(payload)).addValue("time",Timestamp.from(now));
            jdbc.update("""
                    INSERT INTO platform.outbox_event(event_id,event_type,aggregate_id,source_revision,payload,correlation_id,created_at)
                    VALUES(:event,:type,:learner,:revision,CAST(:payload AS jsonb),:id,:time)
                    """,params);
            jdbc.update("""
                    INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,resource_revision,occurred_at,outcome,correlation_id)
                    VALUES(:event,'current-target-role',:type,:id,:revisionText,:time,'SUCCEEDED',:id)
                    """,params.addValue("event",UUID.randomUUID()).addValue("revisionText",revision.toString()));
        }
        return selected;
    }
    private void archiveInitialPathways(Actor actor,Instant now) {
        var params=key(actor).addValue("time",Timestamp.from(now));
        var archived=jdbc.query("""
                UPDATE platform.initial_pathway_current SET review_status='ARCHIVED',archived_at=:time
                WHERE organization_id=:org AND learner_id=:learner AND archived_at IS NULL
                RETURNING request_id,COALESCE(current_revision,0) AS revision
                """,params,(rs,n)->Map.entry(rs.getObject("request_id",UUID.class),rs.getLong("revision")));
        jdbc.update("""
                UPDATE platform.initial_pathway_request SET generation_status='STALE',reason_code='SELECTION_CHANGED',claim_token=NULL,claim_worker_version=NULL,lease_expires_at=NULL
                WHERE organization_id=:org AND learner_id=:learner AND generation_status IN ('PENDING','GENERATING','FAILED_RETRYABLE')
                """,params);
        for(var path:archived) {
            var p=new MapSqlParameterSource(params.getValues()).addValue("id",path.getKey()).addValue("revision",path.getValue())
                    .addValue("event",UUID.randomUUID()).addValue("payload",write(Map.of("payloadVersion",1,"organizationId",actor.organizationId(),
                            "learnerId",actor.learnerId(),"pathwayId",path.getKey(),"reason","SELECTION_CHANGED")));
            jdbc.update("""
                    INSERT INTO platform.outbox_event(event_id,event_type,aggregate_id,source_revision,payload,correlation_id,created_at)
                    VALUES(:event,'INITIAL_PATHWAY_ARCHIVED',:id,:revision,CAST(:payload AS jsonb),:id,:time)
                    """,p);
            jdbc.update("""
                    INSERT INTO platform.audit_event(audit_event_id,service_name,action,resource_id,resource_revision,occurred_at,outcome,correlation_id)
                    VALUES(:event,'current-target-role','INITIAL_PATHWAY_ARCHIVED',:id,:revisionText,:time,'SUCCEEDED',:id)
                    """,p.addValue("event",UUID.randomUUID()).addValue("revisionText",path.getValue().toString()));
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
