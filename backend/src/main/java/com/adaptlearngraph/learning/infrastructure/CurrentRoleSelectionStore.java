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
    private MapSqlParameterSource key(Actor a) { return new MapSqlParameterSource("org",a.organizationId()).addValue("learner",a.learnerId()); }
    @Override public <T> T transaction(Actor a, java.util.function.Supplier<T> work) {
        return tx.execute(status -> {
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
                """,key(a),(rs,n)->new Selection(rs.getObject("selection_id",UUID.class),
                        read(rs.getString("role_snapshot"),Role.class),rs.getLong("target_revision"),rs.getTimestamp("selected_at").toInstant(),true))
                .stream().findFirst();
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
        var old=current(a); Selection selected;
        var now=jdbc.queryForObject("SELECT clock_timestamp()",Map.of(),(rs,n)->rs.getTimestamp(1).toInstant());
        if(old.filter(s->s.role().id().equals(role.id())).isPresent()) selected=old.get();
        else {
            if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.pathway_revision WHERE learner_id=:learner AND status='PUBLISHED_CURRENT')",key(a),Boolean.class)))
                throw new Failure(409,"PATHWAY_REQUIRES_OWNER");
            jdbc.update("UPDATE platform.employee_role_selection SET ended_at=:time WHERE organization_id=:org AND learner_id=:learner AND ended_at IS NULL",key(a).addValue("time",Timestamp.from(now)));
            Long revision=jdbc.queryForObject("UPDATE platform.learner_state SET target_revision=target_revision+1 WHERE learner_id=:learner RETURNING target_revision",key(a),Long.class);
            selected=new Selection(UUID.randomUUID(),role,Objects.requireNonNull(revision),now,true);
            jdbc.update("""
                    INSERT INTO platform.employee_role_selection(selection_id,organization_id,learner_id,role_id,occupation_id,role_snapshot,target_revision,selected_at)
                    VALUES(:id,:org,:learner,:role,:occupation,CAST(:snapshot AS jsonb),:revision,:time)
                    """,key(a).addValue("id",selected.selectionId()).addValue("role",role.id()).addValue("occupation",role.occupationId())
                    .addValue("snapshot",write(role)).addValue("revision",revision).addValue("time",Timestamp.from(now)));
            String event=old.isPresent()?"TARGET_ROLE_CHANGED":"TARGET_ROLE_SELECTED";
            var payload=new LinkedHashMap<String,Object>();
            payload.put("payloadVersion",2); payload.put("organizationId",a.organizationId()); payload.put("learnerId",a.learnerId());
            payload.put("selectionId",selected.selectionId()); payload.put("previousSelectionId",old.map(Selection::selectionId).orElse(null));
            payload.put("roleId",role.id());payload.put("occupationId",role.occupationId());payload.put("targetRevision",revision);payload.put("occurredAt",now);
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
        jdbc.update("""
                INSERT INTO platform.employee_role_selection_request(organization_id,learner_id,retry_key,request_hash,selection_id,response)
                VALUES(:org,:learner,:retry,:hash,:id,CAST(:response AS jsonb))
                """,key(a).addValue("retry",retry).addValue("hash",hash).addValue("id",selected.selectionId()).addValue("response",write(selected)));
        return selected;
    }
    private String write(Object value) { try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Selection serialization failed",e);} }
    private <T>T read(String value,Class<T> type) { try{return json.readValue(value,type);}catch(Exception e){throw new IllegalStateException("Selection snapshot invalid",e);} }
}
