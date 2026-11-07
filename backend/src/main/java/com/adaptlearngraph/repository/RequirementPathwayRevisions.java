package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.*;
import com.adaptlearngraph.entities.domain.RequirementPathway.Plan;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import java.util.*;

/** Format3 extension of the original immutable revision/projection owner. Caller holds the learner and request locks. */
public final class RequirementPathwayRevisions {
    public record Content(String flowVersion,Plan plan) {}
    private final InitialPathwayRepositories data;private final RequirementPathwayJpaRepository rules;
    private final RuleAssessmentAttemptJpaRepository clock;private final ObjectMapper json;
    public RequirementPathwayRevisions(InitialPathwayRepositories data,RequirementPathwayJpaRepository rules,RuleAssessmentAttemptJpaRepository clock,ObjectMapper json) {
        this.data=data;this.rules=rules;this.clock=clock;this.json=json;
    }
    public long publish(RequirementPathwayJpaRepository.Row row,Plan plan,UUID run,String origin,UUID source,Long approvalBasis,String reviewStatus,UUID actor) {
        InitialJpa.requireTransaction();long revision=row.getCurrentRevision()==null?1:row.getCurrentRevision()+1;
        String document=encode(new Content(row.getFlowVersion(),plan)),hash=RoleBaselineFlow.hash(document);
        data.revisions().insert(InitialPathwayRevisionEntity.rule(row.getRequestId(),revision,row.getOrganizationId(),row.getLearnerId(),
                row.getSelectionId(),row.getSelectionRevision(),run,hash,document,origin,source,approvalBasis));
        String projection=encode(plan);
        if(rules.steps(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),revision,projection)!=plan.steps().size()
                || rules.options(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),revision,projection)!=plan.steps().stream().mapToInt(step->step.options().size()).sum()
                || rules.dependencies(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),revision,projection)!=plan.dependencies().size())throw new Failure(503,"REQUIREMENT_PROJECTION_INCOMPLETE");
        if(rules.publish(row.getOrganizationId(),row.getLearnerId(),row.getRequestId(),row.getCurrentRevision(),revision,reviewStatus)!=1)throw new Failure(409,"STALE_PATHWAY_REVISION");
        event(row,revision,"RULE_PATHWAY_REVISION_PUBLISHED",actor,Map.of("changeOrigin",origin,"contentHash",hash,"reviewStatus",reviewStatus));
        return revision;
    }
    public Plan read(RequirementPathwayJpaRepository.Row row) {
        if(row.getCurrentRevision()==null)return new Plan(List.of(),List.of());
        try {
            Content content=json.readerFor(Content.class).with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readValue(row.getContent());
            // JSONB reorders object keys and whitespace. Recreate the publisher's typed
            // document before hashing, while rejecting any lost or changed JSON fields.
            if(!json.readTree(row.getContent()).equals(json.valueToTree(content)))throw new IllegalArgumentException();
            if(!RoleBaselineFlow.hash(encode(content)).equals(row.getContentHash()))throw new IllegalArgumentException();
            if(!Objects.equals(row.getFlowVersion(),content.flowVersion()))throw new IllegalArgumentException();return content.plan();
        }catch(Exception invalid){throw new Failure(503,"PATHWAY_REVISION_INTEGRITY_FAILURE");}
    }
    public void event(RequirementPathwayJpaRepository.Row row,long revision,String type,UUID actor,Map<String,Object> detail) {
        var payload=new LinkedHashMap<String,Object>(detail);payload.put("organizationId",row.getOrganizationId());payload.put("learnerId",row.getLearnerId());
        payload.put("requestId",row.getRequestId());payload.put("sourceRevision",revision);
        var now=clock.clock();
        data.outbox().insert(new OutboxEventEntity(UUID.randomUUID(),type,row.getRequestId(),revision,payload,row.getRequestId(),now));
        data.audit().insert(new AuditEventEntity(UUID.randomUUID(),actor,"pathway",type,row.getRequestId(),Long.toString(revision),now,"ACCEPTED",row.getRequestId()));
    }
    public String encode(Object value){try{return json.writeValueAsString(value);}catch(Exception invalid){throw new Failure(503,"PATHWAY_SNAPSHOT_INVALID");}}
}
