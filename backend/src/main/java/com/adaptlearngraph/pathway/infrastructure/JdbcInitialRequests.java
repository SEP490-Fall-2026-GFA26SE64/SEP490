package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.Review;
import com.adaptlearngraph.recommendation.domain.InitialIdentity;
import java.util.*;

final class JdbcInitialRequests {
    private final InitialJdbc db;
    JdbcInitialRequests(InitialJdbc db) { this.db=db; }
    Optional<Request> request(Scope scope,UUID id) {
        return db.jdbc.query(InitialJdbc.READ+" WHERE r.organization_id=:org AND r.learner_id=:learner AND r.request_id=:id",
                InitialJdbc.key(scope).addValue("id",id),db::map).stream().findFirst();
    }
    Optional<Request> current(Scope scope) {
        return db.jdbc.query(InitialJdbc.READ+" WHERE r.organization_id=:org AND r.learner_id=:learner AND c.archived_at IS NULL",
                InitialJdbc.key(scope),db::map).stream().findFirst();
    }
    Optional<Request> equivalent(Scope scope,Selection selection,String hash) {
        var found=db.jdbc.query(InitialJdbc.READ+"""
                 WHERE r.organization_id=:org AND r.learner_id=:learner AND r.selection_id=:selection
                   AND r.selection_revision=:revision AND r.planning_input_hash=:hash
                """,InitialJdbc.key(scope).addValue("selection",selection.id()).addValue("revision",selection.revision()).addValue("hash",hash),db::map).stream().findFirst();
        if(found.isPresent() && found.get().review()==Review.ARCHIVED)throw new Failure(409,"INITIAL_INPUT_ARCHIVED");
        return found;
    }
    Request create(Scope scope,Frozen frozen,String algorithm,String configuration) {
        InitialJdbc.requireTransaction();
        var old=current(scope);
        if(old.isPresent()) {
            if(old.get().revision()!=null)throw new Failure(409,"REVIEW_REFRESH_REQUIRES_OWNER");
            var previous=InitialJdbc.key(scope).addValue("id",old.get().id());
            db.jdbc.update("UPDATE platform.initial_pathway_current SET review_status='ARCHIVED',archived_at=clock_timestamp() WHERE organization_id=:org AND learner_id=:learner AND request_id=:id",previous);
            db.jdbc.update("UPDATE platform.initial_pathway_request SET generation_status='STALE',reason_code='INPUT_CHANGED',claim_token=NULL,claim_worker_version=NULL,lease_expires_at=NULL WHERE organization_id=:org AND learner_id=:learner AND request_id=:id AND generation_status IN ('PENDING','GENERATING','FAILED_RETRYABLE')",previous);
            db.event(scope,old.get().id(),0,"INITIAL_PATHWAY_ARCHIVED",null,Map.of("reason","INPUT_CHANGED"));
        }
        UUID id=UUID.randomUUID(),gap=UUID.randomUUID(); var input=frozen.input();var selection=frozen.selection();
        String snapshotHash=InitialIdentity.hash("gap-snapshot",List.of(input.preview().gapInputHash(),selection.id(),selection.revision()));
        var p=InitialJdbc.key(scope).addValue("id",id).addValue("gap",gap).addValue("selection",selection.id()).addValue("revision",selection.revision())
                .addValue("occupation",input.binding().occupationId()).addValue("attempt",input.profile().attemptId()).addValue("gapHash",input.preview().gapInputHash())
                .addValue("snapshotHash",snapshotHash).addValue("snapshot",db.codec.encode(input)).addValue("planningHash",frozen.planningHash())
                .addValue("algorithm",algorithm).addValue("configuration",configuration).addValue("frozen",db.codec.encode(frozen));
        db.jdbc.update("""
                INSERT INTO platform.initial_gap_snapshot(gap_snapshot_id,organization_id,learner_id,selection_id,selection_revision,
                    occupation_id,baseline_attempt_id,gap_input_hash,content_hash,snapshot)
                VALUES(:gap,:org,:learner,:selection,:revision,:occupation,:attempt,:gapHash,:snapshotHash,CAST(:snapshot AS jsonb))
                """,p);
        db.jdbc.update("""
                INSERT INTO platform.initial_pathway_request(request_id,organization_id,learner_id,selection_id,selection_revision,gap_snapshot_id,
                    planning_input_hash,algorithm_version,configuration_version,frozen_input,generation_status)
                VALUES(:id,:org,:learner,:selection,:revision,:gap,:planningHash,:algorithm,:configuration,CAST(:frozen AS jsonb),'PENDING')
                """,p);
        db.jdbc.update("""
                INSERT INTO platform.initial_pathway_current(request_id,organization_id,learner_id,selection_id,selection_revision)
                VALUES(:id,:org,:learner,:selection,:revision)
                """,p);
        db.event(scope,id,0,"INITIAL_PATHWAY_REQUESTED",scope.learnerId(),Map.of("planningInputHash",frozen.planningHash()));
        return request(scope,id).orElseThrow();
    }
    List<Request> assigned(UUID org,Set<UUID> ids,int offset,int limit) {
        if(ids.isEmpty())return List.of();
        return db.jdbc.query(InitialJdbc.READ+"""
                 WHERE r.organization_id=:org AND r.request_id IN (:ids) AND c.current_revision IS NOT NULL
                   AND c.archived_at IS NULL ORDER BY r.created_at,r.request_id LIMIT :limit OFFSET :offset
                """,Map.of("org",org,"ids",ids,"limit",limit,"offset",offset),db::map);
    }
    Optional<Scope> assignedScope(UUID org,UUID id) {
        return db.jdbc.query("SELECT organization_id,learner_id FROM platform.initial_pathway_request WHERE organization_id=:org AND request_id=:id",
                Map.of("org",org,"id",id),(rs,n)->new Scope(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class))).stream().findFirst();
    }
}
