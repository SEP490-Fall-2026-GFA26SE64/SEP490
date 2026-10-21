package com.adaptlearngraph.assessment.adaptive.attempt.application;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.psychometrics.*;
import java.math.BigDecimal;
import java.nio.CharBuffer;
import java.nio.charset.*;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/** One owned transaction: replay or validate/score/estimate/next/header/receipt. No current Catalog reads. */
public final class AdaptiveAttemptAnswerService implements Answering {
    private final AdaptiveAttemptContextPort context;
    private final AdaptiveAttemptStore store;
    private final AdaptiveAttemptPolicyPort policies;
    private final AdaptiveAttemptContentPort content;
    private final AdaptiveAttemptScoringPort scoring;
    private final Optional<AdaptiveAttemptFinalizationPort> finalization;
    private final AdaptiveAttemptView views;
    public AdaptiveAttemptAnswerService(AdaptiveAttemptContextPort context, AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptContentPort content, AdaptiveAttemptScoringPort scoring,
            Optional<AdaptiveAttemptFinalizationPort> finalization) {
        this.context = context; this.store = store; this.policies = policies; this.content = content;
        this.scoring = scoring; this.finalization = Objects.requireNonNull(finalization); this.views = new AdaptiveAttemptView(content);
    }
    @Override public View answer(Answer command) {
        if (command == null) throw new Failure(Code.INVALID_REQUEST);
        var employee = context.requireEmployee();
        var owned = store.findOwned(employee.organizationId(), employee.learnerId(), command.attemptId())
                .orElseThrow(() -> new Failure(Code.NOT_FOUND));
        context.authorizeScope(employee, owned.scope());
        String hash = hash(command);
        return store.inTransaction(owned.scope(), () -> {
            context.authorizeScope(context.requireEmployee(), owned.scope());
            var replay = store.replay(owned.scope(), command.idempotencyKey(), AdaptiveAttemptStore.Operation.ANSWER, hash);
            if (replay.isPresent()) {
                var receipt = replay.get();
                return views.project(receipt.outcome(), receipt.progress(), receipt.createdAt());
            }
            var attempt = store.find(owned.scope(), command.attemptId()).orElseThrow(() -> new Failure(Code.NOT_FOUND));
            if (attempt.status() != AdaptiveAttempt.Status.IN_PROGRESS) throw new Failure(Code.ATTEMPT_CLOSED);
            if (attempt.revision() != command.expectedRevision()) throw new Failure(Code.VERSION_CONFLICT);
            requireBeforeDeadline(attempt, store.observedAt(attempt.scope()));
            var progress = store.progress(attempt.scope(), attempt.id());
            var presented = progress.items().getLast();
            if (presented.position() != command.position() || !presented.itemVersionId().equals(command.itemVersionId())
                    || progress.responses().stream().anyMatch(r -> r.position() == command.position())) throw new Failure(Code.ANSWER_NOT_PRESENTED);
            if (!presented.optionOrder().contains(command.selectedOptionId())) throw new Failure(Code.INVALID_OPTION);
            // Only failures from trusted pinned inputs enter B7's audit-only invalidation path.
            AdaptiveItemSelector.Outcome decision;
            boolean correct;
            try {
                var policy = policies.load(attempt.snapshot().blueprint().pins(), attempt.snapshot().itemSkills());
                correct = scoring.correct(attempt.scope(), command.itemVersionId(), command.selectedOptionId(), presented.optionOrder());
                var byPosition = progress.items().stream().collect(Collectors.toMap(item -> item.position(), item -> item.itemVersionId()));
                var answers = new ArrayList<>(progress.responses().stream().map(r -> new Irt3pl.Answer(byPosition.get(r.position()), r.correct())).toList());
                answers.add(new Irt3pl.Answer(command.itemVersionId(), correct));
                decision = new AdaptiveItemSelector(policy.versions(), attempt.snapshot().microSkillIds(), policy.items(), attempt.snapshot().bounds().maxQuestions())
                        .evaluate(answers, Set.copyOf(byPosition.values()), store.observedAt(attempt.scope()), attempt.deadlineAt(), false);
            } catch (AdaptiveAttemptPolicyPort.Failure failure) {
                if (failure.code() == AdaptiveAttemptPolicyPort.Code.DEPENDENCY_UNAVAILABLE) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
                return technical(attempt, command, hash);
            } catch (AdaptiveIrtPolicy.Failure | AdaptiveAttemptScoringPort.TechnicalFailure failure) {
                return technical(attempt, command, hash);
            }
            var nextItem = decision.next().map(item -> Map.entry(item, content.read(attempt.scope(), item.id())));
            var observed = store.observedAt(attempt.scope());
            requireBeforeDeadline(attempt, observed);
            if (observed.isBefore(presented.presentedAt())) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            boolean terminal = decision.action() == AdaptiveItemSelector.Action.FINISH || decision.action() == AdaptiveItemSelector.Action.INVALIDATE;
            if (terminal) finalizer(); // B7 absent -> explicit dependency failure before writes, never partial completion.
            if (!terminal && decision.action() != AdaptiveItemSelector.Action.NEXT) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            var previous = progress.skills().stream().filter(skill -> skill.microSkillId().equals(presented.microSkillId())).findFirst().orElseThrow();
            var estimate = decision.states().get(presented.microSkillId());
            var state = new AdaptiveAttemptStore.SkillState(presented.microSkillId(), BigDecimal.valueOf(estimate.theta()),
                    BigDecimal.valueOf(estimate.standardError()), BigDecimal.valueOf(estimate.information()), estimate.answeredCount(), previous.revision() + 1, observed);
            var nextPresentation = nextItem.map(entry -> new AdaptiveAttemptStore.PresentedItem(command.position() + 1,
                    entry.getKey().id(), entry.getKey().skillId(), List.copyOf(entry.getValue().options().keySet()),
                    Map.of("reason", decision.reason().name()), observed));
            store.accept(attempt.scope(), attempt.id(), new AdaptiveAttemptStore.Response(command.position(), command.selectedOptionId(),
                    correct, observed, UUID.randomUUID()), previous.revision(), state, nextPresentation);
            var next = terminal ? finalizer().finish(attempt, decision, observed) : attempt.advance(command.expectedRevision(), observed);
            boolean technicalInvalidation = next.status() == AdaptiveAttempt.Status.INVALIDATED
                    && next.completionReason().orElseThrow() == AdaptiveAttempt.CompletionReason.TECHNICAL_FAILURE;
            if (terminal && !technicalInvalidation && (decision.action() == AdaptiveItemSelector.Action.FINISH
                    ? next.status() != AdaptiveAttempt.Status.AUTO_SUBMITTED : next.status() != AdaptiveAttempt.Status.INVALIDATED)) {
                throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            }
            return commit(attempt, next, command, hash, observed);
        });
    }
    private View technical(AdaptiveAttempt attempt, Answer command, String hash) {
        var observed = store.observedAt(attempt.scope());
        var next = finalizer().technicalFailure(attempt, observed);
        if (next.status() != AdaptiveAttempt.Status.INVALIDATED) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        return commit(attempt, next, command, hash, observed);
    }
    private AdaptiveAttemptFinalizationPort finalizer() { return finalization.orElseThrow(() -> new Failure(Code.DEPENDENCY_UNAVAILABLE)); }
    private View commit(AdaptiveAttempt previous, AdaptiveAttempt next, Answer command, String hash, Instant observed) {
        store.save(previous.scope(), previous.revision(), next);
        var progress = store.progress(next.scope(), next.id());
        var view = views.project(next, progress, observed);
        store.insertReceipt(next.scope(), new AdaptiveAttemptStore.Receipt(next.scope(), command.idempotencyKey(),
                AdaptiveAttemptStore.Operation.ANSWER, hash, next, progress, observed));
        return view;
    }
    private static void requireBeforeDeadline(AdaptiveAttempt attempt, Instant observed) {
        if (!observed.isBefore(attempt.deadlineAt())) throw new Failure(Code.DEADLINE_REACHED);
    }
    private static String hash(Answer command) {
        String value = "AB-ATTEMPT-ANSWER-V1\n" + command.attemptId() + "\n" + command.expectedRevision() + "\n"
                + command.position() + "\n" + command.itemVersionId() + "\n" + command.selectedOptionId();
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(StandardCharsets.UTF_8.newEncoder().encode(CharBuffer.wrap(value)));
            return HexFormat.of().formatHex(digest.digest());
        } catch (CharacterCodingException invalid) { throw new Failure(Code.INVALID_REQUEST); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
