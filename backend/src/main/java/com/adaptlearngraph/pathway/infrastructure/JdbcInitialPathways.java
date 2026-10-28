package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.Generation;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Plan;
import java.time.Duration;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcInitialPathways implements InitialPathwayStore {
    private final NamedParameterJdbcTemplate jdbc;
    private final JdbcInitialRequests requests;private final JdbcInitialRevisions revisions;private final JdbcInitialWorker worker;
    public JdbcInitialPathways(NamedParameterJdbcTemplate jdbc,Codec codec,TransactionTemplate tx) {
        this.jdbc=jdbc;
        var db=new InitialJdbc(jdbc,codec);requests=new JdbcInitialRequests(db);revisions=new JdbcInitialRevisions(db);worker=new JdbcInitialWorker(db,requests,revisions,tx);
    }
    @Override public Optional<Request> request(Scope scope,UUID id) { return requests.request(scope,id); }
    @Override public Optional<Request> current(Scope scope) { return requests.current(scope); }
    @Override public Optional<Request> equivalent(Scope scope,Selection selection,String hash) { return requests.equivalent(scope,selection,hash); }
    @Override public Request create(Scope scope,Frozen frozen,String algorithm,String configuration) { return requests.create(scope,frozen,algorithm,configuration); }
    @Override public Revision revision(Scope scope,UUID id,long revision) { return revisions.revision(scope,id,revision); }
    @Override public boolean approved(Scope scope,UUID id,long revision,String hash) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.initial_pathway_approval a JOIN platform.initial_pathway_revision v
                    ON v.request_id=a.request_id AND v.revision=a.revision AND v.content_hash=a.content_hash
                    WHERE v.organization_id=:org AND v.learner_id=:learner AND a.organization_id=:org
                      AND a.request_id=:id AND a.revision=:revision AND a.content_hash=:hash AND v.validation_status='VALID')
                """,InitialJdbc.key(scope).addValue("id",id).addValue("revision",revision).addValue("hash",hash),Boolean.class));
    }
    @Override public List<Request> assigned(UUID org,Set<UUID> ids,int offset,int limit) { return requests.assigned(org,ids,offset,limit); }
    @Override public Optional<Scope> assignedScope(UUID org,UUID id) { return requests.assignedScope(org,id); }
    @Override public Optional<String> learnerLabel(Scope scope) {
        return jdbc.query("SELECT identifier FROM platform.account WHERE organization_id=:org AND account_id=:learner",
                InitialJdbc.key(scope),(rs,n)->rs.getString("identifier")).stream().findFirst();
    }
    @Override public Optional<Claim> claim(Duration lease,int maxAttempts,String workerVersion) { return worker.claim(lease,maxAttempts,workerVersion); }
    @Override public boolean finish(Claim claim,Generation status,String reason,Plan plan,Duration retryAfter) { return worker.finish(claim,status,reason,plan,retryAfter); }
    @Override public void saveRevision(Scope scope,Revision previous,Revision next,Actor expert,Assignment assignment,String action,String moduleId,String reason) {
        revisions.save(scope,request(scope,previous.requestId()).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND")),previous,next,expert,assignment,action,moduleId,reason);
    }
    @Override public void approve(Scope scope,Revision revision,Actor expert,Assignment assignment) { revisions.approve(scope,revision,expert,assignment); }
}
