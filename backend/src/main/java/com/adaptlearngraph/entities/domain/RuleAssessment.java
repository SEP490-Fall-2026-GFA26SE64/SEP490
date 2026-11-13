package com.adaptlearngraph.entities.domain;

import java.time.Instant;
import java.util.*;

/** Shared rule paper/scoring values. Neither purpose uses IRT, numeric mastery, or prior-group exemptions. */
public final class RuleAssessment {
    private RuleAssessment() {}
    public enum Purpose { BASELINE, SKILL_ASSESSMENT }
    public enum GroupRole { TARGET, MAIN, PREREQUISITE }
    public record Requirement(String skillId,KnowledgeLevel knowledgeLevel,List<String> outcomeCodes) {
        public Requirement {
            text(skillId);Objects.requireNonNull(knowledgeLevel);outcomeCodes=outcomeCodes==null?List.of():List.copyOf(outcomeCodes);
        }
        public String key(){return skillId+"\n"+knowledgeLevel;}
    }
    public record GroupRule(String skillId,KnowledgeLevel knowledgeLevel,int totalCount,int requiredCorrectCount,
                            boolean mandatoryRequired,boolean allWrongVeto,
                            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) Integer mandatoryCount) {
        public GroupRule(String skillId,KnowledgeLevel knowledgeLevel,int totalCount,int requiredCorrectCount,boolean mandatoryRequired,boolean allWrongVeto) {
            this(skillId,knowledgeLevel,totalCount,requiredCorrectCount,mandatoryRequired,allWrongVeto,null);
        }
        public GroupRule {
            text(skillId);Objects.requireNonNull(knowledgeLevel);
            if(totalCount<1 || totalCount>500 || requiredCorrectCount<1 || requiredCorrectCount>totalCount)
                throw new IllegalArgumentException("Invalid group counts");
            if(mandatoryCount!=null && (mandatoryCount<0 || mandatoryCount>totalCount || mandatoryRequired!=(mandatoryCount>0)))
                throw new IllegalArgumentException("Invalid mandatory count");
        }
        public String key(){return skillId+"\n"+knowledgeLevel;}
        @com.fasterxml.jackson.annotation.JsonCreator(mode=com.fasterxml.jackson.annotation.JsonCreator.Mode.DELEGATING)
        public static GroupRule decode(com.fasterxml.jackson.databind.JsonNode node) {
            var allowed=Set.of("skillId","knowledgeLevel","totalCount","requiredCorrectCount","mandatoryRequired","allWrongVeto","mandatoryCount");
            if(!node.isObject())throw new IllegalArgumentException("Group object required");
            node.fieldNames().forEachRemaining(name->{if(!allowed.contains(name))throw new IllegalArgumentException("Unknown group field");});
            if(!node.path("skillId").isTextual() || !node.path("knowledgeLevel").isTextual()
                    || !node.path("mandatoryRequired").isBoolean() || !node.path("allWrongVeto").isBoolean())
                throw new IllegalArgumentException("Complete group rule required");
            Integer quota=node.hasNonNull("mandatoryCount")?integer(node.get("mandatoryCount")):null;
            return new GroupRule(node.get("skillId").textValue(),KnowledgeLevel.valueOf(node.get("knowledgeLevel").textValue()),
                    integer(node.path("totalCount")),integer(node.path("requiredCorrectCount")),
                    node.get("mandatoryRequired").booleanValue(),node.get("allWrongVeto").booleanValue(),quota);
        }
        private static int integer(com.fasterxml.jackson.databind.JsonNode value) {
            if(!value.isIntegralNumber() || !value.canConvertToInt())throw new IllegalArgumentException("Integer count required");
            return value.intValue();
        }
    }
    public record Policy(int timeLimitSeconds,int retakeWaitSeconds,int maxAttempts,List<GroupRule> groups) {
        public Policy {
            if(timeLimitSeconds<1 || retakeWaitSeconds<0 || maxAttempts<1)throw new IllegalArgumentException("Configure timer and retakes");
            groups=List.copyOf(groups);
            if(groups.isEmpty() || groups.size()>1000 || groups.stream().map(GroupRule::key).distinct().count()!=groups.size())
                throw new IllegalArgumentException("Configure unique exact group rules");
        }
        public GroupRule require(Requirement r) {
            return groups.stream().filter(g->g.key().equals(r.key())).findFirst()
                    .orElseThrow(()->new IllegalArgumentException("Exact group policy is not configured"));
        }
    }
    public record Option(String id,String text) {
        public Option { RuleAssessment.text(id);body(text); }
    }
    /** Staff-only value. Public item projections must omit correctOptionId. */
    public record Candidate(UUID itemVersionId,Requirement requirement,String outcomeCode,boolean mandatory,
                            String prompt,List<Option> options,String correctOptionId,String contentHash,String mappingHash) {
        public Candidate {
            Objects.requireNonNull(itemVersionId);Objects.requireNonNull(requirement);body(prompt);
            options=List.copyOf(options);text(contentHash);text(mappingHash);
            if(options.size()<2 || options.size()>10 || options.stream().map(Option::id).distinct().count()!=options.size()
                || options.stream().noneMatch(o->o.id().equals(correctOptionId)))
                throw new IllegalArgumentException("Invalid published item");
        }
    }
    public record Group(UUID id,Requirement requirement,GroupRole role,GroupRule rule,List<Candidate> items) {
        public Group {
            Objects.requireNonNull(id);Objects.requireNonNull(requirement);Objects.requireNonNull(role);Objects.requireNonNull(rule);
            items=List.copyOf(items);
            if(!rule.key().equals(requirement.key()) || items.size()!=rule.totalCount()
                || items.stream().anyMatch(i->!i.requirement().key().equals(requirement.key())))
                throw new IllegalArgumentException("Paper does not match group");
            if(rule.mandatoryCount()!=null && items.stream().filter(Candidate::mandatory).count()!=rule.mandatoryCount())
                throw new IllegalArgumentException("Paper mandatory quota mismatch");
        }
    }
    public record GroupResult(UUID groupId,Requirement requirement,GroupRole role,int correctCount,int totalCount,
                              boolean mandatorySatisfied,boolean passed,boolean vetoTriggered,List<String> reasons) {
        public GroupResult { reasons=List.copyOf(reasons); }
    }
    public record Paper(Purpose purpose,List<Group> groups,Instant startedAt,Instant deadlineAt) {
        public Paper {
            Objects.requireNonNull(purpose);groups=List.copyOf(groups);Objects.requireNonNull(startedAt);Objects.requireNonNull(deadlineAt);
            if(groups.isEmpty() || !deadlineAt.isAfter(startedAt)
                || groups.stream().map(g->g.requirement().key()).distinct().count()!=groups.size()
                || groups.stream().map(Group::id).distinct().count()!=groups.size())throw new IllegalArgumentException("Invalid paper");
            var ids=new HashSet<UUID>();
            for(var g:groups)for(var item:g.items())if(!ids.add(item.itemVersionId()))throw new IllegalArgumentException("Duplicate paper item");
            if(purpose==Purpose.BASELINE && groups.stream().anyMatch(g->g.role()!=GroupRole.TARGET)
                || purpose==Purpose.SKILL_ASSESSMENT && (groups.stream().filter(g->g.role()==GroupRole.MAIN).count()!=1
                    || groups.stream().anyMatch(g->g.role()==GroupRole.TARGET)))throw new IllegalArgumentException("Invalid purpose groups");
        }
    }
    /** Skill Assessment reserves mandatory items; both purposes fill from the exact Skill/level/version pool. */
    public static Group select(Requirement requirement,GroupRole role,GroupRule rule,List<Candidate> available,Random random) {
        var pool=new ArrayList<>(available.stream().filter(c->c.requirement().key().equals(requirement.key())).toList());
        if(pool.stream().map(Candidate::itemVersionId).distinct().count()!=pool.size())throw new IllegalArgumentException("Duplicate bank item");
        Collections.shuffle(pool,random);
        var chosen=new LinkedHashMap<UUID,Candidate>();
        if(rule.mandatoryCount()!=null) {
            int quota=rule.mandatoryCount();
            for(var c:pool)if(c.mandatory() && chosen.size()<quota)chosen.put(c.itemVersionId(),c);
            if(chosen.size()!=quota)throw new IllegalArgumentException("Insufficient mandatory bank");
            for(var c:pool)if(!c.mandatory() && chosen.size()<rule.totalCount())chosen.put(c.itemVersionId(),c);
            if(chosen.size()!=rule.totalCount())throw new IllegalArgumentException("Insufficient ordinary bank");
        } else {
        for(var c:pool)if(c.mandatory() && (role!=GroupRole.TARGET || rule.mandatoryRequired()))chosen.put(c.itemVersionId(),c);
        if(chosen.size()>rule.totalCount() || pool.size()<rule.totalCount())throw new IllegalArgumentException("Insufficient approved group bank");
        for(var c:pool){if(chosen.size()==rule.totalCount())break;chosen.putIfAbsent(c.itemVersionId(),c);}
        }
        var items=new ArrayList<>(chosen.values());Collections.shuffle(items,random);
        return new Group(UUID.randomUUID(),requirement,role,rule,items);
    }
    /** Saved accepted response only; missing answers score zero. Finalization persists these immutable results once. */
    public static List<GroupResult> score(Paper paper,Map<UUID,String> answers) {
        var results=new ArrayList<GroupResult>();
        for(var g:paper.groups()) {
            int correct=0;boolean mandatory=true;
            for(var item:g.items()) {
                boolean ok=item.correctOptionId().equals(answers.get(item.itemVersionId()));
                if(ok)correct++;else if(item.mandatory())mandatory=false;
            }
            boolean passed=correct>=g.rule().requiredCorrectCount() && (!g.rule().mandatoryRequired() || mandatory);
            boolean veto=g.role()==GroupRole.PREREQUISITE && g.rule().allWrongVeto() && correct==0;
            var reasons=new ArrayList<String>();
            if(correct<g.rule().requiredCorrectCount())reasons.add("CORRECT_COUNT_BELOW_RULE");
            if(g.rule().mandatoryRequired() && !mandatory)reasons.add("MANDATORY_NOT_SATISFIED");
            if(veto)reasons.add("PREREQUISITE_ALL_WRONG_VETO");
            results.add(new GroupResult(g.id(),g.requirement(),g.role(),correct,g.items().size(),mandatory,passed,veto,reasons));
        }
        return List.copyOf(results);
    }
    static List<String> unique(List<String> values) {
        var copy=List.copyOf(values);copy.forEach(RuleAssessment::text);
        if(copy.isEmpty() || copy.size()>1000 || new HashSet<>(copy).size()!=copy.size())throw new IllegalArgumentException("Unique outcomes required");
        return copy;
    }
    static void text(String value) {
        if(value==null || value.isBlank() || value.length()>20000 || value.indexOf('\n')>=0 || value.indexOf('\r')>=0)
            throw new IllegalArgumentException("Invalid rule value");
    }
    static void body(String value) {
        if(value==null || value.isBlank() || value.length()>20000)throw new IllegalArgumentException("Invalid question text");
    }
}
