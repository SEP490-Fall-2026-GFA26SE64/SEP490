package com.adaptlearngraph.assessment.adaptive.attempt.application;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.psychometrics.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/** Shared terminal policy for B6 answers, manual submit and the locked deadline worker. */
public final class AdaptiveAttemptFinalizationService implements AdaptiveAttemptFinalizationPort {
    private final AdaptiveAttemptStore store;
    private final AdaptiveAttemptPolicyPort policies;
    private final AdaptiveAttemptOutcomePort outcomes;
    public AdaptiveAttemptFinalizationService(AdaptiveAttemptStore store, AdaptiveAttemptPolicyPort policies, AdaptiveAttemptOutcomePort outcomes) {
        this.store = store; this.policies = policies; this.outcomes = outcomes;
    }
    @Override public AdaptiveAttempt finalizeAccepted(AdaptiveAttempt attempt) {
        var progress = store.progress(attempt.scope(), attempt.id());
        AdaptiveItemSelector.Outcome decision;
        Instant observed;
        try {
            var policy = policies.load(attempt.snapshot().blueprint().pins(), attempt.snapshot().itemSkills());
            var positions = progress.items().stream().collect(Collectors.toMap(i -> i.position(), i -> i.itemVersionId()));
            var answers = progress.responses().stream().map(r -> new Irt3pl.Answer(positions.get(r.position()), r.correct())).toList();
            var selector = new AdaptiveItemSelector(policy.versions(), attempt.snapshot().microSkillIds(), policy.items(), attempt.snapshot().bounds().maxQuestions());
            decision = selector.evaluate(answers, Set.copyOf(positions.values()), store.observedAt(attempt.scope()), attempt.deadlineAt(), true);
            observed = store.observedAt(attempt.scope());
            if (!observed.isBefore(attempt.deadlineAt()) && decision.reason() != AdaptiveItemSelector.Reason.DEADLINE) {
                decision = selector.evaluate(answers, Set.copyOf(positions.values()), observed, attempt.deadlineAt(), true);
                observed = store.observedAt(attempt.scope());
            }
        } catch (AdaptiveAttemptPolicyPort.Failure failure) {
            if (failure.code() == AdaptiveAttemptPolicyPort.Code.DEPENDENCY_UNAVAILABLE) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            return technicalFailure(attempt, store.observedAt(attempt.scope()));
        } catch (AdaptiveIrtPolicy.Failure failure) {
            return technicalFailure(attempt, store.observedAt(attempt.scope()));
        }
        if (decision.action() == AdaptiveItemSelector.Action.REJECT_SUBMIT) {
            var next=attempt.complete(attempt.revision(),observed,false,false);
            persist(next,store.progress(attempt.scope(),attempt.id()),Map.of());
            return next;
        }
        return finish(attempt, decision, observed);
    }
    @Override public AdaptiveAttempt finish(AdaptiveAttempt attempt, AdaptiveItemSelector.Outcome decision, Instant observed) {
        boolean success = decision.action() == AdaptiveItemSelector.Action.FINISH;
        if (!success && decision.action() != AdaptiveItemSelector.Action.INVALIDATE) throw new IllegalArgumentException("Terminal decision required");
        var progress = store.progress(attempt.scope(), attempt.id());
        var skills = new TreeMap<String, AdaptiveAttemptOutcomePort.Skill>();
        if (success) {
            if (!decision.mastery().keySet().equals(attempt.snapshot().microSkillIds())
                    || !decision.states().keySet().equals(attempt.snapshot().microSkillIds())) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            for (var state : progress.skills()) {
                var estimate = decision.states().get(state.microSkillId());
                if (estimate == null || state.answeredCount() != estimate.answeredCount()
                        || state.theta().compareTo(BigDecimal.valueOf(estimate.theta())) != 0
                        || state.standardError().compareTo(BigDecimal.valueOf(estimate.standardError())) != 0) {
                    return technicalFailure(attempt, observed);
                }
                var mastery = decision.mastery().get(state.microSkillId());
                skills.put(state.microSkillId(), new AdaptiveAttemptOutcomePort.Skill(state.theta(), state.standardError(),
                        BigDecimal.valueOf(mastery.estimatedMastery()), BigDecimal.valueOf(mastery.mastery()), mastery.confidence().name()));
            }
        }
        var next = !success && observed.isBefore(attempt.deadlineAt()) ? attempt.invalidate(attempt.revision(), observed)
                : attempt.complete(attempt.revision(), observed, decision.reason() != AdaptiveItemSelector.Reason.MANUAL, success);
        persist(next, progress, skills);
        return next;
    }
    @Override public AdaptiveAttempt technicalFailure(AdaptiveAttempt attempt, Instant observed) {
        var next = attempt.invalidate(attempt.revision(), observed);
        persist(next, store.progress(attempt.scope(), attempt.id()), Map.of());
        return next;
    }
    private void persist(AdaptiveAttempt next, AdaptiveAttemptStore.Progress progress, Map<String, AdaptiveAttemptOutcomePort.Skill> skills) {
        outcomes.persist(new AdaptiveAttemptOutcomePort.Completion(next, progress.responses().size(),
                Math.toIntExact(progress.responses().stream().filter(AdaptiveAttemptStore.Response::correct).count()), skills));
    }
}
