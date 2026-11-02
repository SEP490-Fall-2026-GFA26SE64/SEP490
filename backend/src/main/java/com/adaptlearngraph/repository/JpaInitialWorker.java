package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayRunEntity;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.repository.InitialPathwayStore.*;
import com.adaptlearngraph.entities.InitialPathwayState.*;
import com.adaptlearngraph.entities.InitialPlanning.Plan;
import java.time.Duration;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

public final class JpaInitialWorker {
    private final InitialJpa db; private final JpaInitialRequests requests; private final JpaInitialRevisions revisions; private final TransactionTemplate tx;
    public JpaInitialWorker(InitialJpa db,JpaInitialRequests requests,JpaInitialRevisions revisions,TransactionTemplate tx) {
        this.db=db;this.requests=requests;this.revisions=revisions;this.tx=tx;
    }
    public Optional<Claim> claim(Duration lease,int maxAttempts,String workerVersion) {
        if(lease.isNegative() || lease.isZero() || maxAttempts<1)throw new IllegalArgumentException("Invalid worker configuration");
        return tx.execute(status->{
            var rows=db.data.requests().claimable();
            if(rows.isEmpty())return Optional.empty();
            var row=rows.getFirst();var scope=new Scope(PersistenceValues.uuid(row[0]),PersistenceValues.uuid(row[1]));
            UUID id=PersistenceValues.uuid(row[2]),token=UUID.randomUUID();int attempt=((Number)row[3]).intValue();
            if(attempt>=maxAttempts) {
                db.data.requests().block(scope.organizationId(),scope.learnerId(),id);
                recordRun(id,token,workerVersion,Generation.BLOCKED,List.of("RETRY_EXHAUSTED"));
                db.event(scope,id,attempt,"INITIAL_PATHWAY_BLOCKED",null,Map.of("reason","RETRY_EXHAUSTED"));return Optional.empty();
            }
            db.data.requests().startGeneration(scope.organizationId(),scope.learnerId(),id,token,workerVersion,lease.toMillis());
            return Optional.of(new Claim(requests.request(scope,id).orElseThrow(),token,attempt+1,workerVersion));
        });
    }
    public boolean finish(Claim claim,Generation generation,String reason,Plan plan,Duration retryAfter) {
        InitialJpa.requireTransaction();var request=claim.request();var scope=request.scope();
        if(Set.of(Generation.PENDING,Generation.GENERATING).contains(generation))throw new IllegalArgumentException("Terminal run outcome required");
        int changed=db.data.requests().finish(scope.organizationId(),scope.learnerId(),request.id(),claim.token(),generation.name(),reason,retryAfter.toMillis());
        if(changed!=1)return false;
        var diagnostics=plan!=null?plan.diagnostics():reason==null?List.<String>of():List.of(reason);
        UUID run=recordRun(request.id(),claim.token(),claim.workerVersion(),generation,diagnostics);
        if(generation==Generation.SUCCEEDED) {
            if(plan==null || !plan.valid() || plan.modules().isEmpty())throw new Failure(503,"INVALID_PROPOSAL");
            var selected=new TreeSet<String>();plan.modules().forEach(m->selected.add(m.id()));
            var revision=new Revision(request.id(),1,run,plan,selected,List.of(),Revision.identity(plan,selected,List.of()),Validation.VALID);
            revisions.insert(scope,request.selection(),revision);
            if(db.data.current().publishFirst(scope.organizationId(),scope.learnerId(),request.id())!=1)throw new Failure(409,"STALE_PROPOSAL");
        }
        db.event(scope,request.id(),claim.attempt(),"INITIAL_PATHWAY_"+generation.name(),null,Map.of("generationStatus",generation.name()));
        return true;
    }
    private UUID recordRun(UUID request,UUID token,String workerVersion,Generation status,List<String> diagnostics) {
        UUID id=UUID.randomUUID();
        db.data.runs().insert(new InitialPathwayRunEntity(id,request,token,workerVersion,status.name(),db.codec.encode(diagnostics),null));
        return id;
    }
}
