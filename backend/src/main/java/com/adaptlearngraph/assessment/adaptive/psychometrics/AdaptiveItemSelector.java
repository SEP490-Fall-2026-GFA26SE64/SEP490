package com.adaptlearngraph.assessment.adaptive.psychometrics;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import static com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveIrtPolicy.*;
import static com.adaptlearngraph.assessment.adaptive.psychometrics.Irt3pl.*;

/** Server-only pure decision engine over an already-authorized/pinned pool; no clocks, persistence or HTTP. */
public final class AdaptiveItemSelector {
    public enum Action { NEXT, FINISH, INVALIDATE, REJECT_SUBMIT }
    public enum Reason { COVERAGE, INFORMATION, RESUME, PRECISION, QUESTION_BOUND, DEADLINE, MANUAL, POOL_EXHAUSTED, BELOW_MINIMUM }
    public record Outcome(Action action, Reason reason, Optional<Item> next, Map<String, Estimate> states,
                          Map<String, ConservativeMastery.Mastery> mastery) {
        public Outcome {
            states = Collections.unmodifiableMap(new TreeMap<>(states));
            mastery = Collections.unmodifiableMap(new TreeMap<>(mastery));
        }
    }
    private final Versions versions;
    private final Set<String> skills;
    private final Map<UUID, Item> pool;
    private final int maximum;
    private final MapAbilityEstimator estimator = new MapAbilityEstimator();

    public AdaptiveItemSelector(Versions versions, Set<String> skills, List<Item> items, int maximum) {
        if (versions == null) throw new Failure(Code.INVALID_POLICY);
        if (skills == null || skills.stream().anyMatch(Objects::isNull) || items == null) throw new Failure(Code.INFEASIBLE_SCOPE);
        this.versions = versions; this.skills = Set.copyOf(skills); this.maximum = maximum;
        Map<UUID, Item> pool = new HashMap<>();
        for (Item item : items) {
            if (item == null) throw new Failure(Code.INVALID_ITEM);
            versions.model().validate(item);
            if (!item.parameterSetId().equals(versions.parameterSetId()) || !this.skills.contains(item.skillId())
                    || pool.putIfAbsent(item.id(), item) != null) throw new Failure(Code.INVALID_ITEM);
        }
        this.pool = Map.copyOf(pool);
        if (this.skills.isEmpty() || maximum > versions.model().maxResponses() || maximum > pool.size()
                || (long) this.skills.size() * versions.model().minimumPerSkill() > maximum
                || this.skills.stream().anyMatch(skill -> pool.values().stream().filter(item -> item.skillId().equals(skill)).count() < versions.model().minimumPerSkill())) {
            throw new Failure(Code.INFEASIBLE_SCOPE);
        }
    }
    /** observedAt/deadlineAt are authoritative server values; presented includes any unanswered pinned item. */
    public Outcome evaluate(List<Answer> answers, Set<UUID> presented, Instant observedAt, Instant deadlineAt, boolean manualSubmit) {
        if (answers == null || answers.stream().anyMatch(Objects::isNull) || presented == null
                || presented.stream().anyMatch(Objects::isNull) || observedAt == null || deadlineAt == null) throw new Failure(Code.INVALID_HISTORY);
        if (!pool.keySet().containsAll(presented) || presented.size() > maximum
                || answers.stream().map(Answer::itemId).distinct().count() != answers.size()
                || answers.stream().anyMatch(answer -> !presented.contains(answer.itemId()))) throw new Failure(Code.INVALID_HISTORY);
        Set<UUID> answered = answers.stream().map(Answer::itemId).collect(Collectors.toUnmodifiableSet());
        var pending = presented.stream().filter(id -> !answered.contains(id)).toList();
        if (pending.size() > 1) throw new Failure(Code.INVALID_HISTORY);
        Map<String, Estimate> states = new TreeMap<>();
        for (String skill : skills) states.put(skill, estimator.estimate(versions.model(), answers.stream()
                .filter(answer -> pool.get(answer.itemId()).skillId().equals(skill))
                .map(answer -> new Observation(pool.get(answer.itemId()), answer.correct())).toList()));
        boolean enough = states.values().stream().allMatch(state -> state.answeredCount() >= versions.model().minimumPerSkill());
        if (!observedAt.isBefore(deadlineAt)) return end(states, enough, Reason.DEADLINE);
        if (manualSubmit) return enough ? end(states, true, Reason.MANUAL)
                : new Outcome(Action.REJECT_SUBMIT, Reason.BELOW_MINIMUM, Optional.empty(), states, Map.of());
        if (answers.size() >= maximum) return end(states, enough, Reason.QUESTION_BOUND);
        if (!pending.isEmpty()) return next(pool.get(pending.getFirst()), states, Reason.RESUME);
        if (enough && states.values().stream().allMatch(state -> state.standardError() <= versions.model().stopSe())) return end(states, true, Reason.PRECISION);
        var available = pool.values().stream().filter(item -> !presented.contains(item.id())).toList();
        Comparator<String> skillOrder = Comparator.<String>comparingInt(skill -> states.get(skill).answeredCount() < versions.model().minimumPerSkill() ? 0 : 1)
                .thenComparingInt(skill -> states.get(skill).answeredCount() < versions.model().minimumPerSkill() ? states.get(skill).answeredCount() : 0)
                .thenComparing(Comparator.comparingDouble((String skill) -> states.get(skill).standardError()).reversed()).thenComparing(Comparator.naturalOrder());
        var skill = skills.stream().filter(id -> states.get(id).answeredCount() < versions.model().minimumPerSkill()
                || states.get(id).standardError() > versions.model().stopSe())
                .filter(id -> available.stream().anyMatch(item -> item.skillId().equals(id))).min(skillOrder);
        if (skill.isEmpty()) return end(states, enough, Reason.POOL_EXHAUSTED);
        Item selected = available.stream().filter(item -> item.skillId().equals(skill.get()))
                .min(Comparator.<Item>comparingDouble(item -> -Irt3pl.information(item, states.get(skill.get()).theta()))
                        .thenComparing(item -> item.id().toString())).orElseThrow();
        return next(selected, states, enough ? Reason.INFORMATION : Reason.COVERAGE);
    }
    private Outcome next(Item item, Map<String, Estimate> states, Reason reason) {
        return new Outcome(Action.NEXT, reason, Optional.of(item), states, Map.of());
    }
    private Outcome end(Map<String, Estimate> states, boolean enough, Reason reason) {
        Map<String, ConservativeMastery.Mastery> mastery = enough ? states.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey,
                entry -> ConservativeMastery.map(versions.model(), versions.mapping(), entry.getValue()).orElseThrow())) : Map.of();
        return new Outcome(enough ? Action.FINISH : Action.INVALIDATE, reason, Optional.empty(), states, mastery);
    }
}
