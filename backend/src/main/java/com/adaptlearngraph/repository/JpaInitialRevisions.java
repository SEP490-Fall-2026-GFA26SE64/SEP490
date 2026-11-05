package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayApprovalEntity;
import com.adaptlearngraph.entities.InitialPathwayDependencyEntity;
import com.adaptlearngraph.entities.InitialPathwayModuleEntity;
import com.adaptlearngraph.entities.InitialPathwayOverrideEntity;
import com.adaptlearngraph.entities.InitialPathwayRevisionEntity;
import com.adaptlearngraph.entities.InitialPathwayTargetEntity;
import com.adaptlearngraph.entities.InitialPathwayTeachingV2Entity;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.repository.InitialPathwayStore.*;
import com.adaptlearngraph.entities.domain.InitialPathwayState.Validation;
import java.util.*;

public final class JpaInitialRevisions {
    private final InitialJpa db;
    JpaInitialRevisions(InitialJpa db) { this.db=db; }
    Revision revision(Scope scope,UUID id,long revision) {
        return db.data.revisions().content(scope.organizationId(),scope.learnerId(),id,revision).stream().map(row->{
            var result=db.codec.decode(row.content(),Revision.class);
            if(row.formatVersion().intValue()!=(result.plan().formatVersion()==null?1:2))throw new Failure(503,"PATHWAY_FORMAT_MISMATCH",false);
            if(!result.requestId().equals(id) || result.revision()!=revision || !result.contentHash().equals(row.contentHash())
                    || !result.contentHash().equals(Revision.identity(result.plan(),result.selectedModules(),result.overrides())))throw new Failure(503,"PATHWAY_INTEGRITY_FAILURE");
            return result;
        }).toList().stream().findFirst().orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
    }
    public void insert(Scope scope,Selection selection,Revision value) {
        InitialJpa.requireTransaction();
        if(!value.contentHash().equals(Revision.identity(value.plan(),value.selectedModules(),value.overrides()))
                || (value.validation()==Validation.VALID)!=value.plan().valid())throw new Failure(503,"INVALID_REVISION");
        if(value.plan().formatVersion()!=null && (value.plan().search()==null || value.plan().quality()==null
                || !Set.of("GENERATION","FIXED_SET").contains(value.plan().search().scope())))throw new Failure(503,"INVALID_REVISION_FORMAT",false);
        UUID org=scope.organizationId(),learner=scope.learnerId(),id=value.requestId();long revision=value.revision();
        db.data.revisions().insert(new InitialPathwayRevisionEntity(id,revision,org,learner,selection.id(),selection.revision(),value.runId(),
                value.contentHash(),value.validation().name(),db.codec.encode(value),null,(short)(value.plan().formatVersion()==null?1:2)));
        for(var module:value.plan().modules()) {
            db.data.modules().insert(new InitialPathwayModuleEntity(id,revision,module.id(),module.contentVersion(),module.ordinal(),
                    module.durationMinutes(),module.priceVnd()));
            for(var target:module.targets()) {
                if(value.plan().formatVersion()!=null) {
                    Short rank=target.coverageRole()==com.adaptlearngraph.entities.domain.InitialPlanning.CoverageRole.COVERAGE?(short)target.preference():null;
                    db.data.teaching().insert(new InitialPathwayTeachingV2Entity(id,revision,null,org,learner,selection.id(),selection.revision(),
                            module.id(),target.skillId(),target.teachingFocus()==null?null:target.teachingFocus().name(),target.difficultyLevel()==null?null:target.difficultyLevel().name(),target.coverageRole().name(),
                            target.preferredDifficulty()==null?null:target.preferredDifficulty().name(),rank,target.expertAttention(),
                            target.attentionReason(),target.suitabilityVersion(),target.reason()));
                    continue;
                }
                db.data.targets().insert(new InitialPathwayTargetEntity(id,revision,module.id(),target.skillId(),target.instructionLevel().name(),
                        target.suitabilityVersion(),target.reason()));
            }
        }
        for(var gate:value.plan().dependencies()) {
            db.data.dependencies().insert(new InitialPathwayDependencyEntity(id,revision,gate.moduleId(),gate.dependentSkillId(),gate.prerequisiteSkillId(),
                    gate.providerModuleId(),gate.definitionId(),gate.version(),gate.internalGateId()));
        }
    }
    void save(Scope scope,Request request,Revision previous,Revision next,Actor expert,Assignment assignment,String action,String moduleId,String reason) {
        InitialJpa.requireTransaction(); insert(scope,request.selection(),next);
        int changed=db.data.current().advance(scope.organizationId(),scope.learnerId(),next.requestId(),previous.revision(),next.revision());
        if(changed!=1)throw new Failure(409,"STALE_REVISION");
        db.data.overrides().insert(new InitialPathwayOverrideEntity(UUID.randomUUID(),next.requestId(),previous.revision(),next.revision(),
                scope.organizationId(),expert.accountId(),assignment.id(),assignment.version(),action,moduleId,reason,null));
        db.event(scope,next.requestId(),next.revision(),"INITIAL_PATHWAY_EDITED",expert.accountId(),Map.of("action",action,"contentHash",next.contentHash()));
    }
    void approve(Scope scope,Revision revision,Actor expert,Assignment assignment) {
        InitialJpa.requireTransaction();
        int changed=db.data.current().approve(scope.organizationId(),scope.learnerId(),revision.requestId(),revision.revision(),revision.contentHash());
        if(changed!=1)throw new Failure(409,"STALE_REVISION");
        db.data.approvals().insert(new InitialPathwayApprovalEntity(revision.requestId(),revision.revision(),revision.contentHash(),
                scope.organizationId(),expert.accountId(),assignment.id(),assignment.version(),null));
        db.event(scope,revision.requestId(),revision.revision(),"INITIAL_PATHWAY_APPROVED",expert.accountId(),Map.of("contentHash",revision.contentHash()));
    }
}
