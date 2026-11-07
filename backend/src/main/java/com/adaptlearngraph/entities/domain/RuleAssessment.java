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
            text(skillId);Objects.requireNonNull(knowledgeLevel);outcomeCodes=unique(outcomeCodes);
        }
        public String key(){return skillId+"\n"+knowledgeLevel;}
    }
    public record GroupRule(String skillId,KnowledgeLevel knowledgeLevel,int totalCount,int requiredCorrectCount,
                            boolean mandatoryRequired,boolean allWrongVeto) {
        public GroupRule {
            text(skillId);Objects.requireNonNull(knowledgeLevel);
            if(totalCount<1 || totalCount>500 || requiredCorrectCount<1 || requiredCorrectCount>totalCount)
                throw new IllegalArgumentException("Invalid group counts");
        }
        public String key(){return skillId+"\n"+knowledgeLevel;}
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
            Objects.requireNonNull(itemVersionId);Objects.requireNonNull(requirement);text(outcomeCode);body(prompt);
            options=List.copyOf(options);text(contentHash);text(mappingHash);
            if(options.size()<2 || options.size()>10 || options.stream().map(Option::id).distinct().count()!=options.size()
                || options.stream().noneMatch(o->o.id().equals(correctOptionId)) || !requirement.outcomeCodes().contains(outcomeCode))
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
    /** Skill Assessment reserves mandatory items; Baseline uses coverage and random fill without mandatory rules. */
    public static Group select(Requirement requirement,GroupRole role,GroupRule rule,List<Candidate> available,Random random) {
        var pool=new ArrayList<>(available.stream().filter(c->c.requirement().key().equals(requirement.key())
                && requirement.outcomeCodes().contains(c.outcomeCode())).toList());
        if(pool.stream().map(Candidate::itemVersionId).distinct().count()!=pool.size())throw new IllegalArgumentException("Duplicate bank item");
        Collections.shuffle(pool,random);
        var chosen=new LinkedHashMap<UUID,Candidate>();
        for(var c:pool)if(c.mandatory() && (role!=GroupRole.TARGET || rule.mandatoryRequired()))chosen.put(c.itemVersionId(),c);
        for(var outcome:requirement.outcomeCodes()) {
            if(chosen.values().stream().noneMatch(c->c.outcomeCode().equals(outcome))) {
                var c=pool.stream().filter(i->i.outcomeCode().equals(outcome)).findFirst()
                        .orElseThrow(()->new IllegalArgumentException("Insufficient approved outcome bank"));
                chosen.put(c.itemVersionId(),c);
            }
        }
        if(chosen.size()>rule.totalCount() || pool.size()<rule.totalCount())throw new IllegalArgumentException("Insufficient approved group bank");
        for(var c:pool){if(chosen.size()==rule.totalCount())break;chosen.putIfAbsent(c.itemVersionId(),c);}
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
