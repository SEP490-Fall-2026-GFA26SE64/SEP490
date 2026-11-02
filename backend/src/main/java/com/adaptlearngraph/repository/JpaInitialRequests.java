package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialGapSnapshotEntity;
import com.adaptlearngraph.entities.InitialPathwayCurrentEntity;
import com.adaptlearngraph.entities.InitialPathwayRequestEntity;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.repository.InitialPathwayStore.*;
import com.adaptlearngraph.entities.InitialPathwayState.Review;
import com.adaptlearngraph.entities.InitialIdentity;
import java.util.*;

public final class JpaInitialRequests {
    private final InitialJpa db;
    JpaInitialRequests(InitialJpa db) { this.db=db; }
    private InitialPathwayRequestJpaRepository requests() { return db.data.requests(); }
    public Optional<Request> request(Scope scope,UUID id) {
        return db.first(requests().request(scope.organizationId(),scope.learnerId(),id));
    }
    Optional<Request> current(Scope scope) {
        return db.first(requests().current(scope.organizationId(),scope.learnerId()));
    }
    Optional<Request> equivalent(Scope scope,Selection selection,String hash) {
        var found=db.first(requests().equivalent(scope.organizationId(),scope.learnerId(),selection.id(),selection.revision(),hash));
        if(found.isPresent() && found.get().review()==Review.ARCHIVED)throw new Failure(409,"INITIAL_INPUT_ARCHIVED");
        return found;
    }
    Request create(Scope scope,Frozen frozen,String algorithm,String configuration) {
        InitialJpa.requireTransaction();
        UUID org=scope.organizationId(),learner=scope.learnerId();
        var old=current(scope);
        if(old.isPresent()) {
            if(old.get().revision()!=null)throw new Failure(409,"REVIEW_REFRESH_REQUIRES_OWNER");
            UUID previous=old.get().id();
            db.data.current().archive(org,learner,previous);
            requests().staleRequest(org,learner,previous,"INPUT_CHANGED");
            db.event(scope,previous,0,"INITIAL_PATHWAY_ARCHIVED",null,Map.of("reason","INPUT_CHANGED"));
        }
        UUID id=UUID.randomUUID(),gap=UUID.randomUUID(); var input=frozen.input();var selection=frozen.selection();
        String snapshotHash=InitialIdentity.hash("gap-snapshot",List.of(input.preview().gapInputHash(),selection.id(),selection.revision()));
        db.data.gaps().insert(new InitialGapSnapshotEntity(gap,org,learner,selection.id(),selection.revision(),input.binding().occupationId(),
                input.profile().attemptId(),input.preview().gapInputHash(),snapshotHash,db.codec.encode(input),null));
        requests().insert(new InitialPathwayRequestEntity(id,org,learner,selection.id(),selection.revision(),gap,frozen.planningHash(),
                algorithm,configuration,db.codec.encode(frozen),"PENDING",null,null,null,null,null,null,null));
        db.data.current().insert(new InitialPathwayCurrentEntity(id,org,learner,selection.id(),selection.revision(),null,null,null));
        db.event(scope,id,0,"INITIAL_PATHWAY_REQUESTED",scope.learnerId(),Map.of("planningInputHash",frozen.planningHash()));
        return request(scope,id).orElseThrow();
    }
    List<Request> assigned(UUID org,Set<UUID> ids,int offset,int limit) {
        if(ids.isEmpty())return List.of();
        return requests().assigned(org,ids,new OffsetPage(offset,limit)).stream().map(db::map).toList();
    }
    Optional<Scope> assignedScope(UUID org,UUID id) {
        return requests().scope(org,id).stream().map(row->new Scope(row.organizationId(),row.learnerId())).findFirst();
    }
}
