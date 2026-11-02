package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.entities.InitialPathwayState.Generation;
import com.adaptlearngraph.entities.InitialPlanning.Plan;
import java.time.Duration;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;

public final class JpaInitialPathways implements InitialPathwayStore {
    private final InitialPathwayRepositories data;
    private final boolean workspaceIdentity;
    private final JpaInitialRequests requests;private final JpaInitialRevisions revisions;private final JpaInitialWorker worker;
    public JpaInitialPathways(InitialPathwayRepositories data,Codec codec,TransactionTemplate tx) {
        this(data,codec,tx,false);
    }
    public JpaInitialPathways(InitialPathwayRepositories data,Codec codec,TransactionTemplate tx,boolean workspaceIdentity) {
        this.data=data;this.workspaceIdentity=workspaceIdentity;
        var db=new InitialJpa(data,codec);requests=new JpaInitialRequests(db);revisions=new JpaInitialRevisions(db);worker=new JpaInitialWorker(db,requests,revisions,tx);
    }
    @Override public Optional<Request> request(Scope scope,UUID id) { return requests.request(scope,id); }
    @Override public Optional<Request> current(Scope scope) { return requests.current(scope); }
    @Override public Optional<Request> equivalent(Scope scope,Selection selection,String hash) { return requests.equivalent(scope,selection,hash); }
    @Override public Request create(Scope scope,Frozen frozen,String algorithm,String configuration) { return requests.create(scope,frozen,algorithm,configuration); }
    @Override public Revision revision(Scope scope,UUID id,long revision) { return revisions.revision(scope,id,revision); }
    @Override public boolean approved(Scope scope,UUID id,long revision,String hash) {
        return data.approvals().approved(scope.organizationId(),scope.learnerId(),id,revision,hash);
    }
    @Override public List<Request> assigned(UUID org,Set<UUID> ids,int offset,int limit) { return requests.assigned(org,ids,offset,limit); }
    @Override public Optional<Scope> assignedScope(UUID org,UUID id) { return requests.assignedScope(org,id); }
    @Override public Optional<String> learnerLabel(Scope scope) {
        if(workspaceIdentity) {
            // In the real workspace account.identifier is an email, not a safe review label.
            return data.actors().workspaceFullName(scope.organizationId(),scope.learnerId()).stream().findFirst();
        }
        return data.actors().identifier(scope.organizationId(),scope.learnerId()).stream().findFirst();
    }
    @Override public Optional<Claim> claim(Duration lease,int maxAttempts,String workerVersion) { return worker.claim(lease,maxAttempts,workerVersion); }
    @Override public boolean finish(Claim claim,Generation status,String reason,Plan plan,Duration retryAfter) { return worker.finish(claim,status,reason,plan,retryAfter); }
    @Override public void saveRevision(Scope scope,Revision previous,Revision next,Actor expert,Assignment assignment,String action,String moduleId,String reason) {
        revisions.save(scope,request(scope,previous.requestId()).orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND")),previous,next,expert,assignment,action,moduleId,reason);
    }
    @Override public void approve(Scope scope,Revision revision,Actor expert,Assignment assignment) { revisions.approve(scope,revision,expert,assignment); }
}
