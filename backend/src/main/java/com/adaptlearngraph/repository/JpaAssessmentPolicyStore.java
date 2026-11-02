package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AssessmentPolicyActivationEventEntity;
import com.adaptlearngraph.entities.AssessmentPolicyCommandEntity;
import com.adaptlearngraph.entities.AssessmentPolicyVersionEntity;
import com.adaptlearngraph.entities.OrganizationAssessmentPolicy.*;
import com.adaptlearngraph.helper.AssessmentPolicyJson;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA adapter: scoped immutable policy versions and exact receipts; no resources or learner writes. */
public final class JpaAssessmentPolicyStore implements AssessmentPolicyStore {
    private final AssessmentPolicyJpaRepository policies;
    private final AssessmentPolicyCommandJpaRepository commands;
    private final AssessmentPolicyActivationEventJpaRepository events;
    private final PostgresAdvisoryLocks locks;
    private final TransactionTemplate writes;
    private final TransactionTemplate reads;
    private final AssessmentPolicyJson json;

    public JpaAssessmentPolicyStore(AssessmentPolicyJpaRepository policies, AssessmentPolicyCommandJpaRepository commands,
            AssessmentPolicyActivationEventJpaRepository events, PostgresAdvisoryLocks locks, PlatformTransactionManager tx,
            AssessmentPolicyJson json) {
        this.policies = policies;
        this.commands = commands;
        this.events = events;
        this.locks = locks;
        this.json = json;
        writes = new TransactionTemplate(tx);
        reads = new TransactionTemplate(tx);
        reads.setReadOnly(true);
        reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    private void coordinate(UUID org) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Policy transaction required");
        locks.lock(org + "\nASSESSMENT_POLICY");
    }

    @Override
    public <T> T locked(UUID org, Supplier<T> work) {
        return writes.execute(s -> {
            coordinate(org);
            return work.get();
        });
    }

    @Override
    public State read(UUID org) {
        return state(org, false);
    }

    private State state(UUID org, boolean lock) {
        if (lock) policies.shareLockActivation(org);
        var row = policies.state(org);
        if (row.isEmpty()) return new State(null, 0);
        Version version = row.get().currentPolicyVersionId() == null ? null
                : policies.version(org, row.get().currentPolicyVersionId()).map(JpaAssessmentPolicyStore::version).orElse(null);
        try {
            return new State(version, row.get().revision());
        } catch (IllegalArgumentException corrupt) {
            throw new Failure(503, "POLICY_INTEGRITY_FAILURE");
        }
    }

    @Override
    public Pin requireEffective(UUID org) {
        coordinate(org);
        var state = state(org, true);
        if (state.active() == null) throw new Failure(503, "ASSESSMENT_POLICY_UNAVAILABLE");
        return state.active().pin();
    }

    @Override
    public Page list(UUID org, int page, int size) {
        return reads.execute(s -> {
            Math.multiplyExact((long) page, size);
            long count = policies.count(org);
            var values = policies.page(org, PageRequest.of(page, size)).stream().map(JpaAssessmentPolicyStore::version).toList();
            return new Page(values, count, page, size);
        });
    }

    @Override
    public Optional<String> receipt(UUID org, UUID actor, UUID id, String hash) {
        return policies.receipt(org, actor, id).map(receipt -> {
            if (!hash.equals(receipt.requestHash())) throw new Failure(409, "IDEMPOTENCY_CONFLICT");
            return receipt.responsePayload();
        });
    }

    @Override
    public Saved save(UUID org, UUID actor, Values values) {
        coordinate(org);
        policies.ensureScope(org);
        var existing = policies.byHash(org, values.hash());
        if (existing.isPresent()) return new Saved(version(existing.get()), true);
        UUID id = UUID.randomUUID();
        policies.insert(new AssessmentPolicyVersionEntity(id, org, policies.maxVersion(org) + 1, "ORG_POLICY_V1", values.stopSe(),
                values.highConfidenceSe(), values.mediumConfidenceSe(), values.k(), values.hash(), actor));
        return new Saved(find(org, id).orElseThrow(), false);
    }

    private Optional<Version> find(UUID org, UUID id) {
        return policies.version(org, id).map(JpaAssessmentPolicyStore::version);
    }

    @Override
    public State activate(UUID org, UUID actor, UUID command, UUID id, long expected) {
        coordinate(org);
        policies.ensureScope(org);
        var v = find(org, id).orElseThrow(() -> new Failure(404, "POLICY_VERSION_NOT_FOUND"));
        var old = state(org, false);
        if (old.activationRevision() != expected) throw new Failure(409, "STALE_POLICY_ACTIVATION");
        if (old.active() != null && old.active().pin().versionId().equals(id)) return old;
        long next = Math.incrementExact(expected);
        if (policies.activate(org, id, actor, expected, next) != 1) throw new Failure(409, "STALE_POLICY_ACTIVATION");
        events.insert(new AssessmentPolicyActivationEventEntity(UUID.randomUUID(), org, next,
                old.active() == null ? null : old.active().pin().versionId(), id, actor, command));
        return new State(v, expected + 1);
    }

    @Override
    public void receipt(UUID org, UUID actor, UUID id, String operation, String hash, Object response) {
        commands.insert(new AssessmentPolicyCommandEntity(org, actor, id, operation, hash, json.write(response)));
        policies.auditReceipt(UUID.randomUUID(), actor, operation, org, hash, id);
    }

    private static Version version(AssessmentPolicyJpaRepository.VersionRow row) {
        try {
            return new Version(new Pin(row.organizationId(), row.policyVersionId(), row.configurationHash(),
                    new Values(row.stopSe(), row.highConfidenceSe(), row.mediumConfidenceSe(), row.k())),
                    row.version(), row.createdBy(), row.createdAt());
        } catch (IllegalArgumentException invalid) {
            throw new Failure(503, "POLICY_INTEGRITY_FAILURE");
        }
    }
}
