package com.adaptlearngraph.assessment.adaptive.attempt.application.port.in;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** REQ-002-F01 application contract, not an HTTP DTO. Capabilities expose safe presented-item projections.
 * Implementations resolve actor/tenant, reauthorize receipts and commit before returning.
 * Never serialize the returned server-only aggregate directly to an Employee.
 */
public interface AdaptiveAttemptUseCase {
    /** Start/read remains independently gated from answer and finalization capabilities. */
    interface StartRead {
        View startOrResume(StartTarget target, String idempotencyKey);
        View resume(UUID attemptId);
    }
    interface Answering { View answer(Answer command); }
    record Answer(UUID attemptId, long expectedRevision, int position, UUID itemVersionId,
                  String selectedOptionId, String idempotencyKey) {
        public Answer {
            if (attemptId == null || attemptId.equals(new UUID(0, 0)) || itemVersionId == null
                    || itemVersionId.equals(new UUID(0, 0)) || expectedRevision < 1 || position < 1
                    || selectedOptionId == null || selectedOptionId.isBlank() || !selectedOptionId.equals(selectedOptionId.strip())
                    || idempotencyKey == null || idempotencyKey.isBlank() || !idempotencyKey.equals(idempotencyKey.strip())
                    || idempotencyKey.length() > 200) throw new Failure(Code.INVALID_REQUEST);
        }
    }
    interface Submitting { View submit(Submit command); }
    /** Employee-safe immutable result/history projection. */
    interface Results {
        List<Result> history();
        Result result(UUID attemptId);
    }
    record Submit(UUID attemptId, long expectedRevision, String idempotencyKey) {
        public Submit {
            if (attemptId == null || attemptId.equals(new UUID(0, 0)) || expectedRevision < 1
                    || idempotencyKey == null || idempotencyKey.isBlank() || !idempotencyKey.equals(idempotencyKey.strip())
                    || idempotencyKey.length() > 200) throw new Failure(Code.INVALID_REQUEST);
        }
    }

    sealed interface StartTarget permits SelectedRole, Exploration {}
    /** The active selection and its Occupation are read from trusted server context. */
    record SelectedRole() implements StartTarget {}
    record Option(String id, String text) {}
    record Presented(int position, UUID itemVersionId, String prompt, List<Option> options, String selectedOptionId) {
        public Presented { options = List.copyOf(options); }
    }
    record View(UUID id, String occupationId, String occupationName, String purpose, String roleId,
                String state, long revision, Instant startedAt, Instant deadlineAt, Instant observedAt,
                boolean expired, int maxQuestions, int answeredCount, List<Presented> items) {
        public View { items = List.copyOf(items); }
    }
    record SkillResult(String microSkillId, String microSkillName, BigDecimal mastery, String confidence) {}
    /** Deliberately excludes theta/SE, answers, scoring keys, item parameters and evidence/receipt data. */
    record Result(UUID attemptId, String occupationId, String occupationName, String purpose,
                  String roleId, String roleName, String state, String completionReason,
                  Instant startedAt, Instant completedAt, UUID replacesAttemptId,
                  UUID replacementAttemptId, BigDecimal rawScore, List<SkillResult> skills) {
        public Result { skills = List.copyOf(skills); }
    }
    enum Code { INVALID_REQUEST, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, SELECTION_UNAVAILABLE,
        BLUEPRINT_UNAVAILABLE, BLUEPRINT_STALE, INFEASIBLE_SCOPE, POLICY_UNAVAILABLE,
        ALLOWANCE_CLOSED, IDEMPOTENCY_CONFLICT, VERSION_CONFLICT, DEPENDENCY_UNAVAILABLE,
        ATTEMPT_CLOSED, DEADLINE_REACHED, ANSWER_NOT_PRESENTED, INVALID_OPTION, MINIMUM_EVIDENCE_NOT_MET }
    final class Failure extends RuntimeException {
        private final Code code;
        public Failure(Code code) { super("Adaptive baseline: " + code); this.code = code; }
        public Code code() { return code; }
    }
    record Exploration(String occupationId) implements StartTarget {
        public Exploration {
            if (occupationId == null || occupationId.isBlank() || !occupationId.equals(occupationId.strip())) {
                throw new IllegalArgumentException("Canonical Occupation required");
            }
        }
    }
}
