package com.adaptlearngraph.assessment.adaptive.attempt.application;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.psychometrics.AdaptiveItemSelector;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.security.*;
import java.util.*;

/** B5 only. B6/B7 answer/finalization capabilities are not registered or simulated here. */
public final class AdaptiveAttemptStartService implements StartRead {
    private final AdaptiveAttemptContextPort context;
    private final AdaptiveAttemptStore store;
    private final AdaptiveAttemptPolicyPort policies;
    private final AdaptiveAttemptContentPort content;
    private final AdaptiveAttemptView views;
    public AdaptiveAttemptStartService(AdaptiveAttemptContextPort context, AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptContentPort content) {
        this.context = context; this.store = store; this.policies = policies; this.content = content;
        this.views = new AdaptiveAttemptView(content);
    }
    @Override public View startOrResume(StartTarget target, String key) {
        if (target == null || key == null || key.isBlank() || !key.equals(key.strip()) || key.length() > 200) throw new Failure(Code.INVALID_REQUEST);
        var employee = context.requireEmployee();
        var scope = store.findReceiptScope(employee.organizationId(), employee.learnerId(), key)
                .orElseGet(() -> context.resolveScope(employee, target));
        context.authorizeScope(employee, scope);
        String hash = hash(target);
        return store.inTransaction(scope, () -> {
            context.authorizeScope(context.requireEmployee(), scope);
            var replay = store.replay(scope, key, AdaptiveAttemptStore.Operation.START, hash);
            if (replay.isPresent()) {
                var receipt = replay.get();
                return views.project(receipt.outcome(), receipt.progress(), receipt.createdAt());
            }
            if (store.hasMasteryProducingCompletion(scope)) throw new Failure(Code.ALLOWANCE_CLOSED);
            var active = store.findInProgress(scope);
            AdaptiveAttempt attempt;
            if (active.isPresent()) attempt = active.get();
            else {
                var snapshot = context.resolveStartingSnapshot(scope, target);
                var policy = policies.load(snapshot.blueprint().pins(), snapshot.itemSkills());
                var selector = new AdaptiveItemSelector(policy.versions(), snapshot.microSkillIds(), policy.items(), snapshot.bounds().maxQuestions());
                var firstTime = store.observedAt(scope);
                var initial = selector.evaluate(List.of(), Set.of(), firstTime, firstTime.plusSeconds(snapshot.bounds().timeLimitSeconds()), false);
                var first = initial.next().orElseThrow(() -> new Failure(Code.INFEASIBLE_SCOPE));
                var item = content.read(scope, first.id());
                // Recheck cross-store readiness after policy/content reads; no distributed ACID claim.
                if (!snapshot.equals(context.resolveStartingSnapshot(scope, target))) throw new Failure(Code.BLUEPRINT_STALE);
                var now = store.observedAt(scope);
                attempt = AdaptiveAttempt.start(UUID.randomUUID(), scope, snapshot, now, false, store.findLatest(scope));
                var skills = initial.states().entrySet().stream().map(entry -> new AdaptiveAttemptStore.SkillState(entry.getKey(),
                        BigDecimal.valueOf(entry.getValue().theta()), BigDecimal.valueOf(entry.getValue().standardError()),
                        BigDecimal.valueOf(entry.getValue().information()), 0, 1, now)).toList();
                store.insert(scope, attempt, skills, new AdaptiveAttemptStore.PresentedItem(1, first.id(), first.skillId(),
                        List.copyOf(item.options().keySet()), Map.of("reason", initial.reason().name()), now));
            }
            var progress = store.progress(scope, attempt.id());
            var observed = store.observedAt(scope);
            View view = views.project(attempt, progress, observed);
            store.insertReceipt(scope, new AdaptiveAttemptStore.Receipt(scope, key, AdaptiveAttemptStore.Operation.START, hash, attempt, progress, observed));
            return view;
        });
    }
    @Override public View resume(UUID id) {
        if (id == null || id.equals(new UUID(0, 0))) throw new Failure(Code.INVALID_REQUEST);
        var employee = context.requireEmployee();
        var owned = store.findOwned(employee.organizationId(), employee.learnerId(), id).orElseThrow(() -> new Failure(Code.NOT_FOUND));
        context.authorizeScope(employee, owned.scope());
        return store.inTransaction(owned.scope(), () -> {
            context.authorizeScope(context.requireEmployee(), owned.scope());
            var attempt = store.find(owned.scope(), id).orElseThrow(() -> new Failure(Code.NOT_FOUND));
            return views.project(attempt, store.progress(attempt.scope(), id), store.observedAt(attempt.scope()));
        });
    }
    private static String hash(StartTarget target) {
        String value = target instanceof Exploration exploration ? "EXPLORATION\n" + exploration.occupationId() : "SELECTED_ROLE";
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update(StandardCharsets.UTF_8.newEncoder().encode(CharBuffer.wrap("AB-ATTEMPT-START-V1\n" + value)));
            return HexFormat.of().formatHex(digest.digest());
        }
        catch (CharacterCodingException invalid) { throw new Failure(Code.INVALID_REQUEST); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
