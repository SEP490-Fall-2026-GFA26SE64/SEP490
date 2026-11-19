package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.AssessmentPolicyScope.Scope;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.repository.AssessmentItemKnowledgeMappingJpaRepository;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import java.util.*;

/** Common knowledge-level inputs expand into the existing exact skill/knowledge policy. */
public final class BaselinePolicyEditor {
    public record LevelRule(KnowledgeLevel knowledgeLevel,Integer totalCount,Integer requiredCorrectCount) {}
    public record Progress(int step,boolean completed,List<LevelRule> levels,Integer timeLimitSeconds,
                           Integer retakeWaitSeconds,Integer maxAttempts,
                           @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) Integer timePerQuestionSeconds) {
        public Progress(int step,boolean completed,List<LevelRule> levels,Integer timeLimitSeconds,Integer retakeWaitSeconds,Integer maxAttempts) {
            this(step,completed,levels,timeLimitSeconds,retakeWaitSeconds,maxAttempts,null);
        }
        public Progress { levels=List.copyOf(levels);if(step<1 || step>3 || completed && step!=3)throw new IllegalArgumentException("Invalid editor step"); }
    }
    public record Capacity(KnowledgeLevel knowledgeLevel,int skillCount,int maxQuestions,List<String> limitingSkills) {}
    public record BankIssue(String roleLevelId,String roleLevelName,String skillId,String skillName,KnowledgeLevel knowledgeLevel) {}
    public List<BankIssue> missingBanks(UUID organization,Scope scope) {
        var sizes=new HashMap<String,Integer>();var issues=new ArrayList<BankIssue>();
        for(var member:scope.memberLevels())for(var group:member.groups()) {
            int available=sizes.computeIfAbsent(group.requirement().key(),ignored->group.skillVersion()==null?0:bank.availableCount(organization,group.requirement().skillId(),group.requirement().knowledgeLevel().name(),group.skillVersion()));
            if(available==0)issues.add(new BankIssue(member.id(),member.name(),group.requirement().skillId(),group.skillName(),group.requirement().knowledgeLevel()));
        }
        return List.copyOf(issues);
    }
    private final AssessmentItemKnowledgeMappingJpaRepository bank;private final int maximum;
    public BaselinePolicyEditor(AssessmentItemKnowledgeMappingJpaRepository bank,int maximum){this.bank=bank;this.maximum=maximum;}
    public List<Capacity> capacities(UUID organization,Scope scope) {
        var result=new ArrayList<Capacity>();
        for(var level:KnowledgeLevel.values()) {
            var groups=scope.groups().stream().filter(g->g.requirement().knowledgeLevel()==level).toList();
            if(groups.isEmpty())continue;
            int limit=500;var sizes=new LinkedHashMap<String,Integer>();
            for(var group:groups) {
                var need=group.requirement();
                int size=group.skillVersion()==null?0:Math.min(500,bank.availableCount(organization,need.skillId(),level.name(),group.skillVersion()));
                sizes.put(group.skillName(),size);limit=Math.min(limit,size);
            }
            final int bound=limit;
            result.add(new Capacity(level,groups.size(),bound,sizes.entrySet().stream().filter(e->e.getValue()==bound).map(Map.Entry::getKey).toList()));
        }
        return List.copyOf(result);
    }
    public Policy validate(UUID organization,Scope scope,Progress progress) {
        if(scope.purpose()!=Purpose.BASELINE)throw new Failure(400,"INVALID_REQUEST");
        var capacities=capacities(organization,scope);
        var expected=capacities.stream().map(Capacity::knowledgeLevel).collect(java.util.stream.Collectors.toSet());
        if(expected.isEmpty() || progress.levels().size()!=expected.size() || !expected.equals(progress.levels().stream().map(LevelRule::knowledgeLevel).collect(java.util.stream.Collectors.toSet())))
            throw new Failure(422,"EXACT_SCOPE_GROUPS_REQUIRED");
        var rules=new EnumMap<KnowledgeLevel,LevelRule>(KnowledgeLevel.class);int total=0;
        for(var row:progress.levels()) {
            rules.put(row.knowledgeLevel(),row);
            var cap=capacities.stream().filter(c->c.knowledgeLevel()==row.knowledgeLevel()).findFirst().orElseThrow();
            if(row.totalCount()!=null) {
                if(row.totalCount()<1 || row.totalCount()>cap.maxQuestions())throw new Failure(422,"QUESTION_COUNT_OUT_OF_RANGE");
                total+=row.totalCount()*cap.skillCount();
            }
            if(row.requiredCorrectCount()!=null && (row.requiredCorrectCount()<1 || row.totalCount()!=null && row.requiredCorrectCount()>row.totalCount()))
                throw new Failure(422,"INVALID_CORRECT_COUNT");
            if(progress.step()>1 && (row.totalCount()==null || row.requiredCorrectCount()==null))throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
        }
        if(scope.sharedBaseline()) {
            for(var member:scope.memberLevels()) {
                long configured=member.groups().stream().mapToLong(group->{var row=rules.get(group.requirement().knowledgeLevel());return row==null || row.totalCount()==null?0:row.totalCount();}).sum();
                if(configured>maximum)throw new Failure(422,"PAPER_CAPACITY_EXCEEDED");
            }
        } else if(total>maximum)throw new Failure(422,"PAPER_CAPACITY_EXCEEDED");
        if(progress.timeLimitSeconds()!=null && progress.timeLimitSeconds()<1 || progress.retakeWaitSeconds()!=null && progress.retakeWaitSeconds()<0
                || progress.maxAttempts()!=null && progress.maxAttempts()<1)throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
        if(progress.timePerQuestionSeconds()!=null && progress.timePerQuestionSeconds()<1 || scope.sharedBaseline() && progress.timeLimitSeconds()!=null)
            throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
        if(progress.step()==3 && ((scope.sharedBaseline()?progress.timePerQuestionSeconds()==null:progress.timeLimitSeconds()==null) || progress.retakeWaitSeconds()==null || progress.maxAttempts()==null))
            throw new Failure(422,"POLICY_CONFIGURATION_REQUIRED");
        if(!progress.completed())return null;
        var expanded=scope.groups().stream().map(group->{
            var rule=rules.get(group.requirement().knowledgeLevel());
            return new GroupRule(group.requirement().skillId(),rule.knowledgeLevel(),rule.totalCount(),rule.requiredCorrectCount(),false,false);
        }).toList();
        return scope.sharedBaseline()?new Policy(null,progress.retakeWaitSeconds(),progress.maxAttempts(),expanded,new BaselineTiming(progress.timePerQuestionSeconds()))
                :new Policy(progress.timeLimitSeconds(),progress.retakeWaitSeconds(),progress.maxAttempts(),expanded);
    }
    public void validatePolicy(UUID organization,Scope scope,Policy policy) {
        var common=new EnumMap<KnowledgeLevel,LevelRule>(KnowledgeLevel.class);
        for(var rule:policy.groups()) {
            if(rule.mandatoryRequired() || rule.allWrongVeto())throw new Failure(422,"BASELINE_MANDATORY_NOT_APPLICABLE");
            var row=new LevelRule(rule.knowledgeLevel(),rule.totalCount(),rule.requiredCorrectCount());
            var previous=common.putIfAbsent(rule.knowledgeLevel(),row);
            if(previous!=null && !previous.equals(row))throw new Failure(422,"UNIFORM_KNOWLEDGE_RULES_REQUIRED");
        }
        if(scope.sharedBaseline()!=(policy.baselineTiming()!=null))throw new Failure(422,"SHARED_ROLE_POLICY_REQUIRED");
        validate(organization,scope,new Progress(3,true,List.copyOf(common.values()),policy.timeLimitSeconds(),policy.retakeWaitSeconds(),policy.maxAttempts(),policy.baselineTiming()==null?null:policy.baselineTiming().secondsPerQuestion()));
    }
}
