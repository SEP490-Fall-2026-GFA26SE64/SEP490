package com.adaptlearngraph.assessment.adaptive.attempt.application;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import java.nio.CharBuffer;
import java.nio.charset.*;
import java.security.*;
import java.util.HexFormat;

/** Exact SUBMIT replay precedes terminal/revision/deadline checks, after persisted reauthorization. */
public final class AdaptiveAttemptSubmitService implements Submitting {
    private final AdaptiveAttemptContextPort context;
    private final AdaptiveAttemptStore store;
    private final AdaptiveAttemptFinalizationPort finalization;
    private final AdaptiveAttemptView views;
    public AdaptiveAttemptSubmitService(AdaptiveAttemptContextPort context, AdaptiveAttemptStore store,
            AdaptiveAttemptFinalizationPort finalization, AdaptiveAttemptContentPort content) {
        this.context = context; this.store = store; this.finalization = finalization; this.views = new AdaptiveAttemptView(content);
    }
    @Override public View submit(Submit command) {
        if (command == null) throw new Failure(Code.INVALID_REQUEST);
        var employee = context.requireEmployee();
        var owned = store.findOwned(employee.organizationId(), employee.learnerId(), command.attemptId()).orElseThrow(() -> new Failure(Code.NOT_FOUND));
        context.authorizeScope(employee, owned.scope());
        String hash = hash(command);
        return store.inTransaction(owned.scope(), () -> {
            context.authorizeScope(context.requireEmployee(), owned.scope());
            var replay = store.replay(owned.scope(), command.idempotencyKey(), AdaptiveAttemptStore.Operation.SUBMIT, hash);
            if (replay.isPresent()) {
                var receipt = replay.get();
                return views.project(receipt.outcome(), receipt.progress(), receipt.createdAt());
            }
            var attempt = store.find(owned.scope(), command.attemptId()).orElseThrow(() -> new Failure(Code.NOT_FOUND));
            if (attempt.status() != AdaptiveAttempt.Status.IN_PROGRESS) throw new Failure(Code.ATTEMPT_CLOSED);
            if (attempt.revision() != command.expectedRevision()) throw new Failure(Code.VERSION_CONFLICT);
            var next = finalization.finalizeAccepted(attempt);
            store.save(attempt.scope(), attempt.revision(), next);
            var progress = store.progress(next.scope(), next.id());
            var observed = next.finishedAt().orElseThrow();
            var view = views.project(next, progress, observed);
            store.insertReceipt(next.scope(), new AdaptiveAttemptStore.Receipt(next.scope(), command.idempotencyKey(),
                    AdaptiveAttemptStore.Operation.SUBMIT, hash, next, progress, observed));
            return view;
        });
    }
    private static String hash(Submit command) {
        String value = "AB-ATTEMPT-SUBMIT-V1\n" + command.attemptId() + "\n" + command.expectedRevision();
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(StandardCharsets.UTF_8.newEncoder().encode(CharBuffer.wrap(value)));
            return HexFormat.of().formatHex(digest.digest());
        } catch (CharacterCodingException invalid) { throw new Failure(Code.INVALID_REQUEST); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
