package com.adaptlearngraph.assessment.adaptive.attempt.application.port.out;

import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.function.Consumer;

/** Persistence contract only; B3 supplies adapters and presented-item/response/estimate storage. */
public interface AdaptiveAttemptStore {
    /** Serialize Employee+Occupation even before its first row; all calls in work share one transaction.
     * Reauthorize before entering; exceptions roll back header, items, responses, receipts and evidence.
     */
    <T> T inTransaction(Scope scope, Supplier<T> work);
    /** Authoritative PostgreSQL observation time under the mutation lock, not client/JVM start time. */
    Instant observedAt(Scope scope);
    /** Owned lookup before Occupation is known; lock/reload by returned scope before any mutation. */
    Optional<AdaptiveAttempt> findOwned(UUID organizationId, UUID learnerId, UUID attemptId);
    /** Owned metadata prelookup only; reauthorize and reload the receipt under request coordination. */
    Optional<Scope> findReceiptScope(UUID organizationId, UUID learnerId, String idempotencyKey);
    Optional<AdaptiveAttempt> find(Scope scope, UUID attemptId);
    Optional<AdaptiveAttempt> findInProgress(Scope scope);
    /** Latest chain member; reject a second successor, cross-scope link or cyclic replacement. */
    Optional<AdaptiveAttempt> findLatest(Scope scope);
    boolean hasMasteryProducingCompletion(Scope scope);
    /** Reauthorize first; key identity spans all this Employee's Occupations and operations.
     * Compare operation/scope/canonical request hash before exact replay, even after terminal state.
     */
    Optional<Receipt> findReceipt(UUID organizationId, UUID learnerId, String idempotencyKey);
    void insertReceipt(Scope scope, Receipt receipt);
    /** Atomic with starting snapshot + first presented item; enforce one active/one successful attempt. */
    void insert(Scope scope, AdaptiveAttempt attempt, List<SkillState> initialSkills, PresentedItem firstItem);
    /** Compare-and-set exact next revision, preserve pins/history; terminal states never update.
     * Successful completion commits immutable result + exactly-once mastery handoff/receipt together.
     * INVALIDATED commits no skill result/mastery. Baseline responses never become BKT observations.
     */
    void save(Scope scope, long expectedRevision, AdaptiveAttempt next);

    /** Transaction-only consistent internal state; not an Employee DTO. */
    Progress progress(Scope scope, UUID attemptId);
    /** Persist server-scored response/estimate/next item; caller saves header and receipt in this transaction. */
    void accept(Scope scope, UUID attemptId, Response response, long expectedSkillRevision,
                SkillState nextSkill, Optional<PresentedItem> nextItem);
    /** Trusted worker only: organization-bounded rows stay locked until all callbacks commit.
     * No request receipt/actor coordination inside callbacks; never nest inTransaction here.
     */
    void withExpired(UUID organizationId, int limit, Consumer<AdaptiveAttempt> work);

    /** Call only after reauthorization, inside request coordination. Mismatched key reuse never replays. */
    default Optional<Receipt> replay(Scope scope, String key, Operation operation, String requestHash) {
        return findReceipt(scope.organizationId(), scope.learnerId(), key).map(receipt -> {
            if (!receipt.scope().equals(scope) || receipt.operation() != operation || !receipt.requestHash().equals(requestHash)) {
                throw new Failure(Code.IDEMPOTENCY_CONFLICT);
            }
            return receipt;
        });
    }

    record SkillState(String microSkillId, BigDecimal theta, BigDecimal standardError, BigDecimal testInformation,
                      int answeredCount, long revision, Instant updatedAt) {}
    record PresentedItem(int position, UUID itemVersionId, String microSkillId, List<String> optionOrder,
                         Map<String, String> selectionTrace, Instant presentedAt) {
        public PresentedItem { optionOrder = List.copyOf(optionOrder); selectionTrace = Map.copyOf(selectionTrace); }
    }
    record Response(int position, String selectedOptionId, boolean correct, Instant acceptedAt, UUID requestId) {}
    record Progress(List<PresentedItem> items, List<Response> responses, List<SkillState> skills) {
        public Progress { items = List.copyOf(items); responses = List.copyOf(responses); skills = List.copyOf(skills); }
    }
    enum Code { FORBIDDEN, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, DEPENDENCY_UNAVAILABLE }
    final class Failure extends RuntimeException {
        private final Code code;
        public Failure(Code code) { super("Adaptive attempt persistence: " + code); this.code = code; }
        public Code code() { return code; }
    }

    enum Operation { START, ANSWER, SUBMIT }
    /** Internal immutable header and progress snapshot; replay never rebuilds it from newer live state. */
    record Receipt(Scope scope, String idempotencyKey, Operation operation, String requestHash,
                   AdaptiveAttempt outcome, Progress progress, Instant createdAt) {
        public Receipt {
            Objects.requireNonNull(scope); Objects.requireNonNull(operation);
            Objects.requireNonNull(outcome); Objects.requireNonNull(createdAt);
            Objects.requireNonNull(progress);
            if (idempotencyKey == null || idempotencyKey.isBlank()
                    || !idempotencyKey.equals(idempotencyKey.strip()) || idempotencyKey.length() > 200
                    || requestHash == null || !requestHash.matches("[0-9a-f]{64}")
                    || !scope.equals(outcome.scope())) {
                throw new IllegalArgumentException("Invalid scoped command receipt");
            }
        }
    }
}
