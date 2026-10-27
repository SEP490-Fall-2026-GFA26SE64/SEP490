package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.Validation;
import java.util.*;

final class JdbcInitialRevisions {
    private final InitialJdbc db;
    JdbcInitialRevisions(InitialJdbc db) { this.db=db; }
    Revision revision(Scope scope,UUID id,long revision) {
        return db.jdbc.query("""
                SELECT content,content_hash FROM platform.initial_pathway_revision
                WHERE organization_id=:org AND learner_id=:learner AND request_id=:id AND revision=:revision
                """,InitialJdbc.key(scope).addValue("id",id).addValue("revision",revision),(rs,n)->{
            var result=db.codec.decode(rs.getString("content"),Revision.class);
            if(!result.requestId().equals(id) || result.revision()!=revision || !result.contentHash().equals(rs.getString("content_hash"))
                    || !result.contentHash().equals(Revision.identity(result.plan(),result.selectedModules(),result.overrides())))throw new Failure(503,"PATHWAY_INTEGRITY_FAILURE");
            return result;
        }).stream().findFirst().orElseThrow(()->new Failure(404,"PATHWAY_NOT_FOUND"));
    }
    void insert(Scope scope,Selection selection,Revision value) {
        InitialJdbc.requireTransaction();
        if(!value.contentHash().equals(Revision.identity(value.plan(),value.selectedModules(),value.overrides()))
                || (value.validation()==Validation.VALID)!=value.plan().valid())throw new Failure(503,"INVALID_REVISION");
        var p=InitialJdbc.key(scope).addValue("id",value.requestId()).addValue("revision",value.revision()).addValue("run",value.runId())
                .addValue("selection",selection.id()).addValue("selectionRevision",selection.revision()).addValue("hash",value.contentHash())
                .addValue("validation",value.validation().name()).addValue("content",db.codec.encode(value));
        db.jdbc.update("""
                INSERT INTO platform.initial_pathway_revision(request_id,revision,organization_id,learner_id,selection_id,selection_revision,
                    run_id,content_hash,validation_status,content)
                VALUES(:id,:revision,:org,:learner,:selection,:selectionRevision,:run,:hash,:validation,CAST(:content AS jsonb))
                """,p);
        for(var module:value.plan().modules()) {
            p.addValue("module",module.id()).addValue("contentVersion",module.contentVersion()).addValue("ordinal",module.ordinal())
                    .addValue("duration",module.durationMinutes()).addValue("price",module.priceVnd());
            db.jdbc.update("""
                    INSERT INTO platform.initial_pathway_module(request_id,revision,module_id,content_version,ordinal,duration_minutes,price_vnd)
                    VALUES(:id,:revision,:module,:contentVersion,:ordinal,:duration,:price)
                    """,p);
            for(var target:module.targets()) {
                p.addValue("skill",target.skillId()).addValue("level",target.instructionLevel().name()).addValue("policy",target.suitabilityVersion()).addValue("reason",target.reason());
                db.jdbc.update("""
                        INSERT INTO platform.initial_pathway_target(request_id,revision,module_id,skill_id,instruction_level,suitability_version,reason)
                        VALUES(:id,:revision,:module,:skill,:level,:policy,:reason)
                        """,p);
            }
        }
        for(var gate:value.plan().dependencies()) {
            p.addValue("module",gate.moduleId()).addValue("dependent",gate.dependentSkillId()).addValue("prerequisite",gate.prerequisiteSkillId())
                    .addValue("provider",gate.providerModuleId()).addValue("definition",gate.definitionId()).addValue("version",gate.version()).addValue("internal",gate.internalGateId());
            db.jdbc.update("""
                    INSERT INTO platform.initial_pathway_dependency(request_id,revision,module_id,dependent_skill_id,prerequisite_skill_id,
                        provider_module_id,gate_definition_id,gate_version,internal_gate_id)
                    VALUES(:id,:revision,:module,:dependent,:prerequisite,:provider,:definition,:version,:internal)
                    """,p);
        }
    }
    void save(Scope scope,Request request,Revision previous,Revision next,Actor expert,Assignment assignment,String action,String moduleId,String reason) {
        InitialJdbc.requireTransaction(); insert(scope,request.selection(),next);
        var p=InitialJdbc.key(scope).addValue("id",next.requestId()).addValue("previous",previous.revision()).addValue("next",next.revision())
                .addValue("hash",previous.contentHash()).addValue("expert",expert.accountId()).addValue("assignment",assignment.id())
                .addValue("assignmentVersion",assignment.version()).addValue("action",action).addValue("module",moduleId).addValue("reason",reason).addValue("override",UUID.randomUUID());
        int changed=db.jdbc.update("""
                UPDATE platform.initial_pathway_current SET current_revision=:next
                WHERE organization_id=:org AND learner_id=:learner AND request_id=:id AND current_revision=:previous
                  AND review_status='AWAITING_EXPERT_REVIEW' AND archived_at IS NULL
                """,p);
        if(changed!=1)throw new Failure(409,"STALE_REVISION");
        db.jdbc.update("""
                INSERT INTO platform.initial_pathway_override(override_id,request_id,previous_revision,next_revision,organization_id,
                    expert_id,assignment_id,assignment_version,action,module_id,reason)
                VALUES(:override,:id,:previous,:next,:org,:expert,:assignment,:assignmentVersion,:action,:module,:reason)
                """,p);
        db.event(scope,next.requestId(),next.revision(),"INITIAL_PATHWAY_EDITED",expert.accountId(),Map.of("action",action,"contentHash",next.contentHash()));
    }
    void approve(Scope scope,Revision revision,Actor expert,Assignment assignment) {
        InitialJdbc.requireTransaction();
        var p=InitialJdbc.key(scope).addValue("id",revision.requestId()).addValue("revision",revision.revision()).addValue("hash",revision.contentHash())
                .addValue("expert",expert.accountId()).addValue("assignment",assignment.id()).addValue("version",assignment.version());
        int changed=db.jdbc.update("""
                UPDATE platform.initial_pathway_current c SET review_status='APPROVED'
                WHERE c.organization_id=:org AND c.learner_id=:learner AND c.request_id=:id AND c.current_revision=:revision
                  AND c.review_status='AWAITING_EXPERT_REVIEW' AND c.archived_at IS NULL
                  AND EXISTS(SELECT 1 FROM platform.initial_pathway_revision v WHERE v.request_id=c.request_id AND v.revision=:revision
                    AND v.content_hash=:hash AND v.validation_status='VALID')
                """,p);
        if(changed!=1)throw new Failure(409,"STALE_REVISION");
        db.jdbc.update("""
                INSERT INTO platform.initial_pathway_approval(request_id,revision,content_hash,organization_id,expert_id,assignment_id,assignment_version)
                VALUES(:id,:revision,:hash,:org,:expert,:assignment,:version)
                """,p);
        db.event(scope,revision.requestId(),revision.revision(),"INITIAL_PATHWAY_APPROVED",expert.accountId(),Map.of("contentHash",revision.contentHash()));
    }
}
