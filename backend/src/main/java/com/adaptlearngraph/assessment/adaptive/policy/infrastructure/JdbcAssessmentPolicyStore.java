package com.adaptlearngraph.assessment.adaptive.policy.infrastructure;

import com.adaptlearngraph.assessment.adaptive.policy.application.AssessmentPolicyStore;
import com.adaptlearngraph.assessment.adaptive.policy.application.AssessmentPolicyService.Failure;
import com.adaptlearngraph.assessment.adaptive.policy.domain.OrganizationAssessmentPolicy.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;

/** Scoped immutable versions and exact receipts; no resources or learner writes. */
public final class JdbcAssessmentPolicyStore implements AssessmentPolicyStore {
    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate writes,reads;
    private final AssessmentPolicyJson json;
    public JdbcAssessmentPolicyStore(NamedParameterJdbcTemplate jdbc,PlatformTransactionManager tx,AssessmentPolicyJson json){
        this.jdbc=jdbc;this.json=json;writes=new TransactionTemplate(tx);reads=new TransactionTemplate(tx);
        reads.setReadOnly(true);reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }
    private MapSqlParameterSource key(UUID org){return new MapSqlParameterSource("org",org);}
    private void coordinate(UUID org){
        if(!TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("Policy transaction required");
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(:scope,0))",Map.of("scope",org+"\nASSESSMENT_POLICY"),(rs,n)->true);
    }
    @Override public <T>T locked(UUID org,Supplier<T> work){return writes.execute(s->{coordinate(org);return work.get();});}
    @Override public State read(UUID org){return state(org,false);}
    private State state(UUID org,boolean lock){
        var rows=jdbc.query("""
                SELECT a.revision,v.* FROM platform.baseline_assessment_policy_activation a
                LEFT JOIN platform.baseline_assessment_policy_version v ON v.organization_id=a.organization_id AND v.policy_version_id=a.current_policy_version_id
                WHERE a.organization_id=:org
                """+(lock?" FOR SHARE OF a":""),key(org),(rs,n)->recordedState(rs.getObject("policy_version_id")==null?null:version(rs),rs.getLong("revision")));
        return rows.isEmpty()?new State(null,0):rows.getFirst();
    }
    @Override public Pin requireEffective(UUID org){
        coordinate(org);var state=state(org,true);
        if(state.active()==null)throw new Failure(503,"ASSESSMENT_POLICY_UNAVAILABLE");return state.active().pin();
    }
    @Override public Page list(UUID org,int page,int size){return reads.execute(s->{
        var p=key(org).addValue("limit",size).addValue("offset",Math.multiplyExact((long)page,size));
        long count=Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM platform.baseline_assessment_policy_version WHERE organization_id=:org",p,Long.class));
        var values=jdbc.query("SELECT * FROM platform.baseline_assessment_policy_version WHERE organization_id=:org ORDER BY version DESC LIMIT :limit OFFSET :offset",p,(rs,n)->version(rs));
        return new Page(values,count,page,size);
    });}
    @Override public Optional<String> receipt(UUID org,UUID actor,UUID id,String hash){
        return jdbc.query("SELECT request_hash,response_payload::text FROM platform.baseline_assessment_policy_command WHERE organization_id=:org AND actor_id=:actor AND command_key=:key",
                key(org).addValue("actor",actor).addValue("key",id),(rs,n)->{
                    if(!hash.equals(rs.getString(1)))throw new Failure(409,"IDEMPOTENCY_CONFLICT");return rs.getString(2);
                }).stream().findFirst();
    }
    @Override public Saved save(UUID org,UUID actor,Values values){
        coordinate(org);ensureScope(org);
        var p=key(org).addValue("hash",values.hash());
        var existing=jdbc.query("SELECT * FROM platform.baseline_assessment_policy_version WHERE organization_id=:org AND configuration_hash=:hash",p,(rs,n)->version(rs));
        if(!existing.isEmpty())return new Saved(existing.getFirst(),true);
        UUID id=UUID.randomUUID();
        jdbc.update("""
                INSERT INTO platform.baseline_assessment_policy_version(organization_id,policy_version_id,version,schema_version,
                  stop_se,high_confidence_se,medium_confidence_se,k,configuration_hash,created_by)
                SELECT :org,:id,coalesce(max(version),0)+1,'ORG_POLICY_V1',:stop,:high,:medium,:k,:hash,:actor
                FROM platform.baseline_assessment_policy_version WHERE organization_id=:org
                """,p.addValue("id",id).addValue("actor",actor).addValue("stop",values.stopSe()).addValue("high",values.highConfidenceSe())
                .addValue("medium",values.mediumConfidenceSe()).addValue("k",values.k()));
        return new Saved(find(org,id).orElseThrow(),false);
    }
    private void ensureScope(UUID org){jdbc.update("INSERT INTO platform.baseline_assessment_policy_activation(organization_id) VALUES(:org) ON CONFLICT DO NOTHING",key(org));}
    private Optional<Version> find(UUID org,UUID id){return jdbc.query("SELECT * FROM platform.baseline_assessment_policy_version WHERE organization_id=:org AND policy_version_id=:id",key(org).addValue("id",id),(rs,n)->version(rs)).stream().findFirst();}
    @Override public State activate(UUID org,UUID actor,UUID command,UUID id,long expected){
        coordinate(org);ensureScope(org);
        var v=find(org,id).orElseThrow(()->new Failure(404,"POLICY_VERSION_NOT_FOUND"));var old=state(org,false);
        if(old.activationRevision()!=expected)throw new Failure(409,"STALE_POLICY_ACTIVATION");
        if(old.active()!=null && old.active().pin().versionId().equals(id))return old;
        var p=key(org).addValue("id",id).addValue("actor",actor).addValue("revision",expected)
                .addValue("next",Math.incrementExact(expected)).addValue("old",old.active()==null?null:old.active().pin().versionId())
                .addValue("key",command).addValue("event",UUID.randomUUID());
        if(jdbc.update("UPDATE platform.baseline_assessment_policy_activation SET current_policy_version_id=:id,revision=:next,changed_by=:actor,changed_at=clock_timestamp() WHERE organization_id=:org AND revision=:revision",p)!=1)
            throw new Failure(409,"STALE_POLICY_ACTIVATION");
        jdbc.update("""
                INSERT INTO platform.baseline_assessment_policy_activation_event(event_id,organization_id,activation_revision,
                  old_policy_version_id,new_policy_version_id,actor_id,command_key)
                VALUES(:event,:org,:next,:old,:id,:actor,:key)
                """,p);
        return new State(v,expected+1);
    }
    @Override public void receipt(UUID org,UUID actor,UUID id,String operation,String hash,Object response){
        var p=key(org).addValue("actor",actor).addValue("key",id).addValue("operation",operation).addValue("hash",hash).addValue("response",json.write(response));
        jdbc.update("""
                INSERT INTO platform.baseline_assessment_policy_command(organization_id,actor_id,command_key,operation,request_hash,response_payload)
                VALUES(:org,:actor,:key,:operation,:hash,CAST(:response AS jsonb))
                """,p);
        jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id,actor_id,service_name,action,resource_id,resource_revision,occurred_at,outcome,correlation_id)
                VALUES(:audit,:actor,'adaptive-baseline-policy',:operation,:org,:hash,clock_timestamp(),'RECORDED',:key)
                """,p.addValue("audit",UUID.randomUUID()));
    }
    private Version version(ResultSet rs)throws SQLException{
        try{return new Version(new Pin(rs.getObject("organization_id",UUID.class),rs.getObject("policy_version_id",UUID.class),rs.getString("configuration_hash"),
                new Values(rs.getDouble("stop_se"),rs.getDouble("high_confidence_se"),rs.getDouble("medium_confidence_se"),rs.getDouble("k"))),
                rs.getLong("version"),rs.getObject("created_by",UUID.class),rs.getTimestamp("created_at").toInstant());}
        catch(IllegalArgumentException invalid){throw new Failure(503,"POLICY_INTEGRITY_FAILURE");}
    }
    private State recordedState(Version version,long revision){
        try{return new State(version,revision);}catch(IllegalArgumentException corrupt){throw new Failure(503,"POLICY_INTEGRITY_FAILURE");}
    }
}
