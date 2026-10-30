package com.adaptlearngraph.learning.application;

import java.util.Arrays;

/** Stable application error exposed to the future HTTP adapter. */
public final class TargetRoleSelectionException extends RuntimeException {
    private final Code code;

    public TargetRoleSelectionException(Code code, String message) {
        super(message);
        this.code = code;
    }

    public TargetRoleSelectionException(Code code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public Code code() {
        return code;
    }

    public static TargetRoleSelectionException replay(String outcomeCode) {
        Code code = Arrays.stream(Code.values())
                .filter(candidate -> candidate.name().equals(outcomeCode))
                .findFirst()
                .orElse(Code.SELECTION_STATE_CONFLICT);
        return new TargetRoleSelectionException(code, code.defaultMessage());
    }

    public enum Code {
        UNAUTHENTICATED("Authentication is required"),
        FORBIDDEN("An active employee context is required"),
        ROLE_NOT_AVAILABLE("The target role is not available"),
        CATALOG_UNAVAILABLE("The target-role catalog is unavailable"),
        IDEMPOTENCY_CONFLICT("The idempotency key was already used for another request"),
        REQUEST_IN_PROGRESS("The selection request is still being processed"),
        STALE_SELECTION("The active target role changed before this request was applied"),
        ASSESSMENT_IN_PROGRESS("A target role cannot be changed while an assessment is in progress"),
        DEPENDENCY_UNAVAILABLE("A target-role selection dependency is unavailable"),
        SELECTION_STATE_CONFLICT("The target-role selection state is inconsistent");

        private final String defaultMessage;

        Code(String defaultMessage) {
            this.defaultMessage = defaultMessage;
        }

        public String defaultMessage() {
            return defaultMessage;
        }
    }
}
