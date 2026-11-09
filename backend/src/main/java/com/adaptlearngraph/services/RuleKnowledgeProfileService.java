package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.RuleKnowledgeProfileJpaRepository;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;

public final class RuleKnowledgeProfileService {
    public record Entry(String kind,UUID id,String skillId,String skillName,KnowledgeLevel knowledgeLevel,String skillVersion,List<String> outcomeCodes,
            Instant observedAt,String purpose,UUID attemptId,Integer correctCount,Integer totalCount,Boolean passed,Boolean mandatorySatisfied,
            Boolean vetoTriggered,List<String> reasons,String sourceKind,UUID sourceId,String reviewState) {}
    public record Page(List<Entry> items,int page,int pageSize,boolean hasMore) { public Page { items=List.copyOf(items); } }
    private final RoleBaselineFlow.Identity identity;private final RuleKnowledgeProfileJpaRepository data;private final ObjectMapper json;
    public RuleKnowledgeProfileService(RoleBaselineFlow.Identity identity,RuleKnowledgeProfileJpaRepository data,ObjectMapper json) {
        this.identity=identity;this.data=data;this.json=json;
    }
    public Page read(String kind,int page) {
        var actor=identity.requireEmployee();
        if(!Set.of("ALL","DIAGNOSTIC","EVIDENCE","REVIEW").contains(kind) || page<0 || page>250)throw new Failure(400,"INVALID_REQUEST");
        var rows=data.page(actor.organizationId(),actor.learnerId(),kind,21,page*20);
        var items=rows.stream().limit(20).map(row->new Entry(row.getKind(),row.getId(),row.getSkillId(),row.getSkillName(),KnowledgeLevel.valueOf(row.getKnowledgeLevel()),
                row.getSkillVersion(),List.of(),row.getObservedAt(),row.getPurpose(),row.getAttemptId(),row.getCorrectCount(),row.getTotalCount(),
                row.getPassed(),row.getMandatorySatisfied(),row.getVetoTriggered(),strings(row.getReasons()),row.getSourceKind(),row.getSourceId(),row.getReviewState())).toList();
        if(!actor.equals(identity.requireEmployee()))throw new Failure(403,"FORBIDDEN");
        return new Page(items,page,20,rows.size()>20);
    }
    private List<String> strings(String value) {
        try{return List.copyOf(json.readValue(value,new TypeReference<List<String>>(){}));}
        catch(Exception invalid){throw new Failure(503,"PROFILE_PROVENANCE_INVALID");}
    }
}
