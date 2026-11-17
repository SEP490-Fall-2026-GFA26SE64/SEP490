package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.RiasecRules;
import com.adaptlearngraph.entities.domain.RiasecRules.Failure;
import com.fasterxml.jackson.databind.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** PostgreSQL owns personal drafts, receipts, jobs and retention. Every user query is owner scoped. */
public final class RiasecStore {
    public record Owner(UUID organizationId,UUID accountId) {}
    public record Workspace(UUID draftId,Map<String,Integer> answers,long revision,UUID editorId) {}
    public record Result(UUID id,Map<String,Integer> scores,Instant submittedAt,Instant deletedAt,String aiStatus,
                         JsonNode recommendations,String failureCode,String instrumentVersion,String scoringVersion) {}
    public record Job(UUID id,Owner owner,UUID runId,Map<String,Integer> scores) {}
    private final JdbcTemplate db;private final TransactionTemplate tx;private final ObjectMapper json;
    public RiasecStore(JdbcTemplate db,TransactionTemplate tx,ObjectMapper json) {this.db=db;this.tx=tx;this.json=json;}
    public <T>T transaction(Supplier<T> work) {return tx.execute(s->work.get());}
    public Workspace lock(Owner o) {
        db.update("INSERT INTO platform.riasec_workspace(organization_id,account_id) VALUES (?,?) ON CONFLICT DO NOTHING",o.organizationId,o.accountId);
        return db.queryForObject("SELECT * FROM platform.riasec_workspace WHERE organization_id=? AND account_id=? FOR UPDATE",(r,n)->workspace(r),o.organizationId,o.accountId);
    }
    public Workspace read(Owner o) {
        return db.query("SELECT * FROM platform.riasec_workspace WHERE organization_id=? AND account_id=?",(r,n)->workspace(r),o.organizationId,o.accountId).stream().findFirst().orElse(new Workspace(null,Map.of(),0,null));
    }
    public List<Result> results(Owner o) {
        return db.query("SELECT * FROM platform.riasec_result WHERE organization_id=? AND account_id=? AND (deleted_at IS NULL OR deleted_at>now()-interval '7 days') ORDER BY submitted_at DESC,result_id DESC",(r,n)->result(r),o.organizationId,o.accountId);
    }
    public void draft(Owner o,UUID id,UUID editor) {
        db.update("UPDATE platform.riasec_workspace SET draft_id=?,answers='{}',revision=revision+1,editor_id=?,updated_at=now() WHERE organization_id=? AND account_id=?",id,editor,o.organizationId,o.accountId);
    }
    public void claim(Owner o,UUID editor) {
        db.update("UPDATE platform.riasec_workspace SET editor_id=?,revision=revision+1,updated_at=now() WHERE organization_id=? AND account_id=?",editor,o.organizationId,o.accountId);
    }
    public void save(Owner o,Map<String,Integer> answers) {
        db.update("UPDATE platform.riasec_workspace SET answers=?::jsonb,revision=revision+1,updated_at=now() WHERE organization_id=? AND account_id=?",encode(answers),o.organizationId,o.accountId);
    }
    public void submit(Owner o,UUID id,Map<String,Integer> answers,Map<String,Integer> scores) {
        db.update("INSERT INTO platform.riasec_result(result_id,organization_id,account_id,answers,scores,instrument_version,scoring_version,ai_status,ai_deadline,run_id) VALUES (?,?,?,?::jsonb,?::jsonb,?,?,'QUEUED',now()+interval '20 minutes',?)",id,o.organizationId,o.accountId,encode(answers),encode(scores),RiasecRules.INSTRUMENT,RiasecRules.SCORING,UUID.randomUUID());
        db.update("UPDATE platform.riasec_workspace SET draft_id=NULL,answers='{}',revision=revision+1,editor_id=NULL,updated_at=now() WHERE organization_id=? AND account_id=?",o.organizationId,o.accountId);
    }
    public void delete(Owner o,UUID id) {
        db.update("UPDATE platform.riasec_result SET deleted_at=now() WHERE organization_id=? AND account_id=? AND result_id=? AND deleted_at IS NULL",o.organizationId,o.accountId,id);
    }
    public void restore(Owner o,UUID id) {
        if(db.update("UPDATE platform.riasec_result SET deleted_at=NULL WHERE organization_id=? AND account_id=? AND result_id=? AND deleted_at>now()-interval '7 days'",o.organizationId,o.accountId,id)!=1)throw new Failure(410,"RESTORE_EXPIRED");
    }
    public void purge(Owner o,UUID id) {
        if(db.update("DELETE FROM platform.riasec_result WHERE organization_id=? AND account_id=? AND result_id=? AND deleted_at>now()-interval '7 days' AND ai_status NOT IN ('QUEUED','PROCESSING')",o.organizationId,o.accountId,id)!=1)throw new Failure(409,"RESULT_NOT_INACTIVE");
    }
    public void retry(Owner o,UUID id) {
        db.update("UPDATE platform.riasec_result SET ai_status='QUEUED',ai_deadline=now()+interval '20 minutes',run_id=?,failure_code=NULL WHERE organization_id=? AND account_id=? AND result_id=? AND ai_status='FAILED' AND deleted_at IS NULL",UUID.randomUUID(),o.organizationId,o.accountId,id);
    }
    public Optional<Job> claimJob() {
        return transaction(()->{
            db.execute("SELECT pg_advisory_xact_lock(729106021)");
            return db.query("UPDATE platform.riasec_result SET ai_status='PROCESSING',ai_deadline=now()+interval '8 minutes' WHERE result_id=(SELECT result_id FROM platform.riasec_result WHERE ai_status='QUEUED' AND deleted_at IS NULL AND ai_deadline>now() AND NOT EXISTS (SELECT 1 FROM platform.riasec_result WHERE ai_status='PROCESSING' AND ai_deadline>now()) ORDER BY submitted_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *",(r,n)->new Job(r.getObject("result_id",UUID.class),new Owner(r.getObject("organization_id",UUID.class),r.getObject("account_id",UUID.class)),r.getObject("run_id",UUID.class),numbers(r.getString("scores")))).stream().findFirst();
        });
    }
    public void complete(Job job,Object recommendations,String model) {
        db.update("UPDATE platform.riasec_result SET ai_status='SUCCEEDED',recommendations=?::jsonb,model=?,prompt_version='riasec-match-v6-interests-only',failure_code=NULL WHERE result_id=? AND run_id=? AND ai_status='PROCESSING' AND ai_deadline>now() AND deleted_at IS NULL",encode(recommendations),model,job.id,job.runId);
    }
    public void recordModel(Job job,String model) {
        db.update("UPDATE platform.riasec_result SET model=?,prompt_version='riasec-match-v6-interests-only' WHERE organization_id=? AND account_id=? AND result_id=? AND run_id=? AND ai_status='PROCESSING'",model,job.owner.organizationId,job.owner.accountId,job.id,job.runId);
    }
    public void fail(Job job,String code) {
        db.update("UPDATE platform.riasec_result SET ai_status='FAILED',failure_code=? WHERE result_id=? AND run_id=? AND ai_status='PROCESSING'",code,job.id,job.runId);
    }
    public void maintenance() {
        db.update("UPDATE platform.riasec_result SET ai_status='FAILED',failure_code='AI_TIMEOUT' WHERE ai_status IN ('QUEUED','PROCESSING') AND ai_deadline<=now()");
        db.update("DELETE FROM platform.riasec_result WHERE deleted_at<=now()-interval '7 days'");
    }
    public void expire(Owner o) {
        db.update("UPDATE platform.riasec_result SET ai_status='FAILED',failure_code='AI_TIMEOUT' WHERE organization_id=? AND account_id=? AND ai_status IN ('QUEUED','PROCESSING') AND ai_deadline<=now()",o.organizationId,o.accountId);
    }
    private Workspace workspace(ResultSet r)throws SQLException {return new Workspace(r.getObject("draft_id",UUID.class),numbers(r.getString("answers")),r.getLong("revision"),r.getObject("editor_id",UUID.class));}
    private Result result(ResultSet r)throws SQLException {return new Result(r.getObject("result_id",UUID.class),numbers(r.getString("scores")),instant(r,"submitted_at"),instant(r,"deleted_at"),r.getString("ai_status"),tree(r.getString("recommendations")),r.getString("failure_code"),r.getString("instrument_version"),r.getString("scoring_version"));}
    private static Instant instant(ResultSet r,String key)throws SQLException {var value=r.getTimestamp(key);return value==null?null:value.toInstant();}
    private JsonNode tree(String value) {try{return value==null?null:json.readTree(value);}catch(Exception e){throw new IllegalStateException("Invalid persisted RIASEC document",e);}}
    private Map<String,Integer> numbers(String value) {try{return json.readValue(value,json.getTypeFactory().constructMapType(LinkedHashMap.class,String.class,Integer.class));}catch(Exception e){throw new IllegalStateException("Invalid persisted RIASEC scores",e);}}
    private String encode(Object value) {try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalArgumentException("Invalid RIASEC document",e);}}
}
