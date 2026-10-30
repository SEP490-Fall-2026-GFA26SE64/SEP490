package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Plan;
import java.time.Duration;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

final class JdbcInitialWorker {
    private final InitialJdbc db; private final JdbcInitialRequests requests; private final JdbcInitialRevisions revisions; private final TransactionTemplate tx;
    JdbcInitialWorker(InitialJdbc db,JdbcInitialRequests requests,JdbcInitialRevisions revisions,TransactionTemplate tx) {
        this.db=db;this.requests=requests;this.revisions=revisions;this.tx=tx;
    }
    Optional<Claim> claim(Duration lease,int maxAttempts,String workerVersion) {
        if(lease.isNegative() || lease.isZero() || maxAttempts<1)throw new IllegalArgumentException("Invalid worker configuration");
        return tx.execute(status->{
            var rows=db.jdbc.query("""
                    SELECT r.organization_id,r.learner_id,r.request_id,r.attempts FROM platform.initial_pathway_request r
                    JOIN platform.initial_pathway_current c USING(request_id)
                    JOIN platform.employee_role_selection s ON s.selection_id=r.selection_id AND s.ended_at IS NULL
                    JOIN platform.account a ON a.account_id=r.learner_id AND a.organization_id=r.organization_id AND a.active
                    WHERE c.archived_at IS NULL AND c.current_revision IS NULL AND
                      ((r.generation_status IN ('PENDING','FAILED_RETRYABLE') AND r.next_retry_at<=clock_timestamp())
                       OR (r.generation_status='GENERATING' AND r.lease_expires_at<=clock_timestamp()))
                    ORDER BY r.created_at,r.request_id LIMIT 1 FOR UPDATE OF r SKIP LOCKED
                    """,Map.of(),(rs,n)->Map.entry(new Scope(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class)),
                    Map.entry(rs.getObject(3,UUID.class),rs.getInt(4))));
            if(rows.isEmpty())return Optional.empty();
            var row=rows.getFirst();var scope=row.getKey();UUID id=row.getValue().getKey(),token=UUID.randomUUID();int attempt=row.getValue().getValue();
            var p=InitialJdbc.key(scope).addValue("id",id).addValue("token",token).addValue("leaseMs",lease.toMillis()).addValue("worker",workerVersion);
            if(attempt>=maxAttempts) {
                db.jdbc.update("UPDATE platform.initial_pathway_request SET generation_status='BLOCKED',reason_code='RETRY_EXHAUSTED',claim_token=NULL,claim_worker_version=NULL,lease_expires_at=NULL WHERE request_id=:id AND organization_id=:org AND learner_id=:learner",p);
                recordRun(id,token,workerVersion,Generation.BLOCKED,List.of("RETRY_EXHAUSTED"));
                db.event(scope,id,attempt,"INITIAL_PATHWAY_BLOCKED",null,Map.of("reason","RETRY_EXHAUSTED"));return Optional.empty();
            }
            db.jdbc.update("""
                    UPDATE platform.initial_pathway_request SET generation_status='GENERATING',reason_code=NULL,claim_token=:token,claim_worker_version=:worker,
                        lease_expires_at=clock_timestamp()+(:leaseMs * interval '1 millisecond'),attempts=attempts+1
                    WHERE request_id=:id AND organization_id=:org AND learner_id=:learner
                    """,p);
            return Optional.of(new Claim(requests.request(scope,id).orElseThrow(),token,attempt+1,workerVersion));
        });
    }
    boolean finish(Claim claim,Generation generation,String reason,Plan plan,Duration retryAfter) {
        InitialJdbc.requireTransaction();var request=claim.request();var scope=request.scope();
        if(Set.of(Generation.PENDING,Generation.GENERATING).contains(generation))throw new IllegalArgumentException("Terminal run outcome required");
        var p=InitialJdbc.key(scope).addValue("id",request.id()).addValue("token",claim.token()).addValue("status",generation.name())
                .addValue("reason",reason).addValue("retryMs",retryAfter.toMillis());
        int changed=db.jdbc.update("""
                UPDATE platform.initial_pathway_request r SET generation_status=:status,reason_code=:reason,claim_token=NULL,claim_worker_version=NULL,lease_expires_at=NULL,
                    next_retry_at=clock_timestamp()+(:retryMs * interval '1 millisecond')
                WHERE r.organization_id=:org AND r.learner_id=:learner AND r.request_id=:id AND r.generation_status='GENERATING'
                  AND r.claim_token=:token AND r.lease_expires_at>clock_timestamp()
                  AND EXISTS(SELECT 1 FROM platform.initial_pathway_current c WHERE c.request_id=r.request_id AND c.archived_at IS NULL AND c.current_revision IS NULL)
                """,p);
        if(changed!=1)return false;
        var diagnostics=plan!=null?plan.diagnostics():reason==null?List.<String>of():List.of(reason);
        UUID run=recordRun(request.id(),claim.token(),claim.workerVersion(),generation,diagnostics);
        if(generation==Generation.SUCCEEDED) {
            if(plan==null || !plan.valid() || plan.modules().isEmpty())throw new Failure(503,"INVALID_PROPOSAL");
            var selected=new TreeSet<String>();plan.modules().forEach(m->selected.add(m.id()));
            var revision=new Revision(request.id(),1,run,plan,selected,List.of(),Revision.identity(plan,selected,List.of()),Validation.VALID);
            revisions.insert(scope,request.selection(),revision);
            if(db.jdbc.update("""
                    UPDATE platform.initial_pathway_current SET current_revision=1,review_status='AWAITING_EXPERT_REVIEW'
                    WHERE organization_id=:org AND learner_id=:learner AND request_id=:id AND current_revision IS NULL AND archived_at IS NULL
                    """,p)!=1)throw new Failure(409,"STALE_PROPOSAL");
        }
        db.event(scope,request.id(),claim.attempt(),"INITIAL_PATHWAY_"+generation.name(),null,Map.of("generationStatus",generation.name()));
        return true;
    }
    private UUID recordRun(UUID request,UUID token,String workerVersion,Generation status,List<String> diagnostics) {
        UUID id=UUID.randomUUID();
        db.jdbc.update("""
                INSERT INTO platform.initial_pathway_run(run_id,request_id,claim_token,worker_version,generation_status,diagnostics)
                VALUES(:run,:request,:token,:worker,:status,CAST(:diagnostics AS jsonb))
                """,Map.of("run",id,"request",request,"token",token,"worker",workerVersion,"status",status.name(),"diagnostics",db.codec.encode(diagnostics)));
        return id;
    }
}
