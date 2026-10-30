package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Shared SQL mapping and atomic audit/outbox participant. No independent transaction manager. */
final class InitialJdbc {
    final NamedParameterJdbcTemplate jdbc; final Codec codec;
    InitialJdbc(NamedParameterJdbcTemplate jdbc,Codec codec) { this.jdbc=jdbc;this.codec=codec; }
    static MapSqlParameterSource key(Scope s) { return new MapSqlParameterSource("org",s.organizationId()).addValue("learner",s.learnerId()); }
    static void requireTransaction() { if(!TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("Initial pathway write requires owner transaction"); }
    static final String READ="""
            SELECT r.*,c.review_status,c.current_revision,v.validation_status,v.content_hash
            FROM platform.initial_pathway_request r JOIN platform.initial_pathway_current c USING(request_id)
            LEFT JOIN platform.initial_pathway_revision v ON v.request_id=c.request_id AND v.revision=c.current_revision
            """;
    Request map(ResultSet rs,int row) throws SQLException {
        var scope=new Scope(rs.getObject("organization_id",UUID.class),rs.getObject("learner_id",UUID.class));
        var frozen=codec.decode(rs.getString("frozen_input"),Frozen.class);
        if(!frozen.selection().id().equals(rs.getObject("selection_id",UUID.class)) || frozen.selection().revision()!=rs.getLong("selection_revision")
                || !frozen.planningHash().equals(rs.getString("planning_input_hash")))throw new Failure(503,"PATHWAY_INTEGRITY_FAILURE");
        return new Request(rs.getObject("request_id",UUID.class),scope,frozen.selection(),frozen,Generation.valueOf(rs.getString("generation_status")),
                rs.getString("reason_code"),Review.valueOf(rs.getString("review_status")),rs.getObject("current_revision",Long.class),
                rs.getString("validation_status")==null?null:Validation.valueOf(rs.getString("validation_status")),rs.getString("content_hash"));
    }
    void event(Scope scope,UUID id,long revision,String action,UUID actor,Map<String,?> fields) {
        requireTransaction(); var payload=new TreeMap<String,Object>(fields);
        payload.put("payloadVersion",1);payload.put("organizationId",scope.organizationId());payload.put("learnerId",scope.learnerId());
        payload.put("pathwayId",id);payload.put("revision",revision);
        var p=key(scope).addValue("id",id).addValue("revision",revision).addValue("event",UUID.randomUUID())
                .addValue("action",action).addValue("payload",codec.encode(payload)).addValue("actor",actor).addValue("revisionText",Long.toString(revision));
        jdbc.update("""
                INSERT INTO platform.outbox_event(event_id,event_type,aggregate_id,source_revision,payload,correlation_id)
                VALUES(:event,:action,:id,:revision,CAST(:payload AS jsonb),:id)
                """,p);
        jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id,actor_id,service_name,action,resource_id,resource_revision,outcome,correlation_id)
                VALUES(:event,:actor,'initial-pathway',:action,:id,:revisionText,'SUCCEEDED',:id)
                """,p.addValue("event",UUID.randomUUID()));
    }
}
