package com.adaptlearngraph.learning.application;

import com.adaptlearngraph.learning.application.TargetRoleSelectionException.Code;
import com.adaptlearngraph.learning.application.port.in.ChooseTargetRoleCommand;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionResult;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionResult.Disposition;
import com.adaptlearngraph.learning.application.port.out.AssessmentActivityGuardPort;
import com.adaptlearngraph.learning.application.port.out.AssessmentActivityGuardPort.ActivityGuardUnavailableException;
import com.adaptlearngraph.learning.application.port.out.PathwayArchivePort;
import com.adaptlearngraph.learning.application.port.out.PathwayArchivePort.PathwayArchiveException;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort.SelectableTargetRole;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort.SelectionActor;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort.EventType;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort.TargetSelectionEvent;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.LearnerTargetState;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.PendingSelectionRequest;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.RequestStatus;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.StoredSelectionRequest;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import com.adaptlearngraph.learning.domain.TargetSelectionDecision;
import com.adaptlearngraph.learning.domain.TargetSelectionDecision.Kind;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/** Executes the PostgreSQL-owned part of a selection command inside a transaction. */
public final class TargetSelectionCommandProcessor {
    private final AssessmentActivityGuardPort assessmentGuard;
    private final PathwayArchivePort pathways;
    private final TargetSelectionEventPort events;
    private final TargetSelectionStorePort store;
    private final Clock clock;
    private final Supplier<UUID> identifiers;

    public TargetSelectionCommandProcessor(
            AssessmentActivityGuardPort assessmentGuard,
            PathwayArchivePort pathways,
            TargetSelectionEventPort events,
            TargetSelectionStorePort store,
            Clock clock,
            Supplier<UUID> identifiers) {
        this.assessmentGuard = Objects.requireNonNull(assessmentGuard, "assessmentGuard must not be null");
        this.pathways = Objects.requireNonNull(pathways, "pathways must not be null");
        this.events = Objects.requireNonNull(events, "events must not be null");
        this.store = Objects.requireNonNull(store, "store must not be null");
        this.clock = Objects.requireNonNull(clock, "clock must not be null");
        this.identifiers = Objects.requireNonNull(identifiers, "identifiers must not be null");
    }

    OperationOutcome apply(
            SelectionActor actor,
            SelectableTargetRole role,
            ChooseTargetRoleCommand command,
            String requestHash) {
        LearnerTargetState learner = store.lockLearner(actor.accountId());
        Optional<StoredSelectionRequest> existing =
                store.findRequest(actor.accountId(), command.idempotencyKey());
        if (existing.isPresent()) {
            return replay(actor.accountId(), existing.orElseThrow(), requestHash);
        }

        UUID requestId = identifiers.get();
        Instant now = clock.instant();
        if (!store.claimRequest(new PendingSelectionRequest(
                requestId, actor.accountId(), command.idempotencyKey(), requestHash, now))) {
            return store.findRequest(actor.accountId(), command.idempotencyKey())
                    .map(request -> replay(actor.accountId(), request, requestHash))
                    .orElseGet(() -> OperationOutcome.failure(error(Code.SELECTION_STATE_CONFLICT)));
        }

        TargetRoleSelection current = store.findActiveSelection(actor.accountId()).orElse(null);
        if (current != null && current.targetRevision() != learner.targetRevision()) {
            return reject(requestId, Code.SELECTION_STATE_CONFLICT, now);
        }
        TargetSelectionDecision decision = TargetSelectionDecision.decide(current, role.snapshot());
        if (!matchesExpected(command, decision)) {
            return reject(requestId, Code.STALE_SELECTION, now);
        }
        if (decision.kind() == Kind.NO_OP) {
            store.completeRequest(requestId, current.selectionId(), current.targetRevision(), false, now);
            return OperationOutcome.success(new TargetRoleSelectionResult(current, Disposition.UNCHANGED));
        }
        if (decision.kind() == Kind.CHANGE && hasBlockingAssessment(actor.accountId())) {
            return reject(requestId, Code.ASSESSMENT_IN_PROGRESS, now);
        }

        long newRevision;
        try {
            newRevision = Math.incrementExact(learner.targetRevision());
        } catch (ArithmeticException revisionOverflow) {
            return reject(requestId, Code.SELECTION_STATE_CONFLICT, now);
        }
        if (decision.kind() == Kind.CHANGE) {
            archivePathway(actor.accountId(), current.selectionId(), now);
            store.endSelection(actor.accountId(), current.selectionId(), now);
        }

        TargetRoleSelection selection = new TargetRoleSelection(
                identifiers.get(), actor.accountId(), role.catalogReferenceId(), role.snapshot(),
                now, null, newRevision);
        store.insertSelection(selection);
        store.updateTargetRevision(actor.accountId(), learner.targetRevision(), newRevision);
        events.record(new TargetSelectionEvent(
                identifiers.get(), identifiers.get(), actor.accountId(), actor.organizationId(), actor.accountId(),
                selection.selectionId(), current == null ? null : current.selectionId(),
                role.snapshot().id(), newRevision,
                decision.kind() == Kind.INITIAL ? EventType.SELECTED : EventType.CHANGED,
                requestId, now));
        store.completeRequest(requestId, selection.selectionId(), newRevision, true, now);
        return OperationOutcome.success(new TargetRoleSelectionResult(selection, Disposition.APPLIED));
    }

    OperationOutcome replay(UUID learnerId, StoredSelectionRequest request, String requestHash) {
        if (!request.requestHash().equals(requestHash)) {
            return OperationOutcome.failure(error(Code.IDEMPOTENCY_CONFLICT));
        }
        if (request.status() == RequestStatus.PENDING) {
            return OperationOutcome.failure(error(Code.REQUEST_IN_PROGRESS));
        }
        if (request.status() == RequestStatus.REJECTED) {
            return OperationOutcome.failure(TargetRoleSelectionException.replay(request.outcomeCode()));
        }
        TargetRoleSelection selection = store.findSelection(
                        learnerId, request.resultSelectionId(), request.resultTargetRevision())
                .orElseThrow(() -> error(Code.SELECTION_STATE_CONFLICT));
        Disposition originalDisposition = request.resultChanged()
                ? Disposition.APPLIED
                : Disposition.UNCHANGED;
        return OperationOutcome.success(new TargetRoleSelectionResult(selection, originalDisposition));
    }

    private OperationOutcome reject(UUID requestId, Code code, Instant completedAt) {
        store.rejectRequest(requestId, code.name(), completedAt);
        return OperationOutcome.failure(error(code));
    }

    private static boolean matchesExpected(
            ChooseTargetRoleCommand command,
            TargetSelectionDecision decision) {
        UUID expected = command.expectedCurrentSelectionId();
        if (decision.kind() == Kind.INITIAL) {
            return expected == null;
        }
        if (expected != null) {
            return expected.equals(decision.currentSelection().selectionId());
        }
        return decision.kind() == Kind.NO_OP;
    }

    private boolean hasBlockingAssessment(UUID learnerId) {
        try {
            return assessmentGuard.hasBlockingAssessment(learnerId);
        } catch (ActivityGuardUnavailableException unavailable) {
            throw dependencyUnavailable(unavailable);
        }
    }

    private void archivePathway(UUID learnerId, UUID selectionId, Instant archivedAt) {
        try {
            pathways.archiveCurrentPathway(learnerId, selectionId, archivedAt);
        } catch (PathwayArchiveException unavailable) {
            throw dependencyUnavailable(unavailable);
        }
    }

    private static TargetRoleSelectionException dependencyUnavailable(RuntimeException cause) {
        return new TargetRoleSelectionException(
                Code.DEPENDENCY_UNAVAILABLE, Code.DEPENDENCY_UNAVAILABLE.defaultMessage(), cause);
    }

    private static TargetRoleSelectionException error(Code code) {
        return new TargetRoleSelectionException(code, code.defaultMessage());
    }

    record OperationOutcome(
            TargetRoleSelectionResult result,
            TargetRoleSelectionException failure) {

        OperationOutcome {
            if ((result == null) == (failure == null)) {
                throw new IllegalArgumentException("outcome requires exactly one result or failure");
            }
        }

        TargetRoleSelectionResult resultOrThrow() {
            if (failure != null) {
                throw failure;
            }
            return result;
        }

        static OperationOutcome success(TargetRoleSelectionResult result) {
            return new OperationOutcome(Objects.requireNonNull(result), null);
        }

        static OperationOutcome failure(TargetRoleSelectionException failure) {
            return new OperationOutcome(null, Objects.requireNonNull(failure));
        }
    }
}
