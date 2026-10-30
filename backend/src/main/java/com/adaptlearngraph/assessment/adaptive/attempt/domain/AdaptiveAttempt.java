package com.adaptlearngraph.assessment.adaptive.attempt.domain;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable lifecycle header. Responses, estimates and completion/evidence commit through the store. */
public record AdaptiveAttempt(UUID id, Scope scope, AdaptiveAttemptSnapshot snapshot, long revision,
        Status status, Instant startedAt, Instant deadlineAt, Optional<Instant> finishedAt,
        Optional<UUID> replacesAttemptId, Optional<CompletionReason> completionReason) {
    public enum Status { IN_PROGRESS, SUBMITTED, AUTO_SUBMITTED, INVALIDATED }
    public enum CompletionReason { MANUAL, ADAPTIVE_STOP, DEADLINE, TECHNICAL_FAILURE }

    public record Scope(UUID organizationId, UUID learnerId, String occupationId) {
        public Scope {
            requiredId(organizationId); requiredId(learnerId);
            new AdaptiveBlueprint.Scope(organizationId, occupationId);
            if (!occupationId.equals(occupationId.strip())) throw new IllegalArgumentException("Canonical Occupation required");
        }
    }

    public AdaptiveAttempt {
        requiredId(id); Objects.requireNonNull(scope); Objects.requireNonNull(snapshot);
        Objects.requireNonNull(status); Objects.requireNonNull(startedAt); Objects.requireNonNull(deadlineAt);
        Objects.requireNonNull(finishedAt); Objects.requireNonNull(replacesAttemptId);
        Objects.requireNonNull(completionReason); replacesAttemptId.ifPresent(AdaptiveAttempt::requiredId);
        if (revision < 1 || !scope.organizationId().equals(snapshot.blueprint().scope().organizationId())
                || !scope.occupationId().equals(snapshot.blueprint().scope().occupationId())
                || !deadlineAt.equals(startedAt.plusSeconds(snapshot.bounds().timeLimitSeconds()))
                || replacesAttemptId.filter(id::equals).isPresent()
                || (status == Status.IN_PROGRESS) != finishedAt.isEmpty()
                || finishedAt.isPresent() != completionReason.isPresent()
                || finishedAt.filter(time -> time.isBefore(startedAt)).isPresent()) {
            throw new IllegalArgumentException("Invalid attempt identity, revision, timing or terminal metadata");
        }
        boolean validCompletion = switch (status) {
            case IN_PROGRESS -> completionReason.isEmpty();
            case SUBMITTED -> completionReason.orElseThrow() == CompletionReason.MANUAL
                    && finishedAt.orElseThrow().isBefore(deadlineAt);
            case AUTO_SUBMITTED -> completionReason.orElseThrow() == CompletionReason.ADAPTIVE_STOP
                    && finishedAt.orElseThrow().isBefore(deadlineAt)
                    || completionReason.orElseThrow() == CompletionReason.DEADLINE
                    && !finishedAt.orElseThrow().isBefore(deadlineAt);
            case INVALIDATED -> completionReason.orElseThrow() == CompletionReason.TECHNICAL_FAILURE
                    || completionReason.orElseThrow() == CompletionReason.MANUAL
                    && finishedAt.orElseThrow().isBefore(deadlineAt)
                    || completionReason.orElseThrow() == CompletionReason.DEADLINE
                    && !finishedAt.orElseThrow().isBefore(deadlineAt);
        };
        if (!validCompletion) throw new IllegalArgumentException("Completion reason does not match state/deadline");
    }

    /** Under the Employee+Occupation lock, after reauthorization/receipt lookup and before any write.
     * previous is the latest attempt, with no replacement already linked; the store enforces uniqueness.
     */
    public static AdaptiveAttempt start(UUID id, Scope scope, AdaptiveAttemptSnapshot snapshot, Instant now,
            boolean masteryAlreadyProduced, Optional<AdaptiveAttempt> previous) {
        Objects.requireNonNull(previous);
        if (masteryAlreadyProduced || previous.filter(attempt -> !attempt.scope().equals(scope)
                || attempt.status() != Status.INVALIDATED || attempt.id().equals(id)
                || now.isBefore(attempt.finishedAt().orElseThrow())).isPresent()) {
            throw new IllegalStateException("Allowance closed or predecessor is not replaceable");
        }
        return new AdaptiveAttempt(id, scope, snapshot, 1, Status.IN_PROGRESS, now,
                now.plusSeconds(snapshot.bounds().timeLimitSeconds()), Optional.empty(),
                previous.map(AdaptiveAttempt::id), Optional.empty());
    }

    /** Called only after server validation of a presented response; no client correctness/time accepted. */
    public AdaptiveAttempt advance(long expectedRevision, Instant observedAt) {
        requireMutable(expectedRevision, observedAt);
        if (!observedAt.isBefore(deadlineAt)) throw new IllegalStateException("Deadline reached");
        return next(Status.IN_PROGRESS, Optional.empty(), Optional.empty());
    }

    /** Evidence is evaluated by the pinned server policy, never supplied by an Employee.
     * At/after deadline both request and worker take the automatic path; no answer is accepted here.
     */
    public AdaptiveAttempt complete(long expectedRevision, Instant observedAt, boolean automatic,
            boolean minimumEvidenceMet) {
        requireMutable(expectedRevision, observedAt);
        boolean expired = !observedAt.isBefore(deadlineAt);
        Status nextStatus = !minimumEvidenceMet ? Status.INVALIDATED
                : expired || automatic ? Status.AUTO_SUBMITTED : Status.SUBMITTED;
        CompletionReason reason = expired ? CompletionReason.DEADLINE
                : automatic ? CompletionReason.ADAPTIVE_STOP : CompletionReason.MANUAL;
        return next(nextStatus, Optional.of(observedAt), Optional.of(reason));
    }

    /** No result or mastery may accompany this transition; retained responses are audit-only. */
    public AdaptiveAttempt invalidate(long expectedRevision, Instant observedAt) {
        requireMutable(expectedRevision, observedAt);
        return next(Status.INVALIDATED, Optional.of(observedAt), Optional.of(CompletionReason.TECHNICAL_FAILURE));
    }

    public boolean masteryProducing() { return status == Status.SUBMITTED || status == Status.AUTO_SUBMITTED; }

    private void requireMutable(long expectedRevision, Instant observedAt) {
        Objects.requireNonNull(observedAt);
        if (status != Status.IN_PROGRESS || revision != expectedRevision || observedAt.isBefore(startedAt)) {
            throw new IllegalStateException("Attempt is terminal, stale or server time is invalid");
        }
    }

    private AdaptiveAttempt next(Status state, Optional<Instant> finished, Optional<CompletionReason> reason) {
        return new AdaptiveAttempt(id, scope, snapshot, Math.incrementExact(revision), state, startedAt,
                deadlineAt, finished, replacesAttemptId, reason);
    }

    private static void requiredId(UUID id) {
        if (id == null || id.equals(new UUID(0, 0))) throw new IllegalArgumentException("Non-nil ID required");
    }
}
