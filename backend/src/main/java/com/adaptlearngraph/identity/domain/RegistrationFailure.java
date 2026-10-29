package com.adaptlearngraph.identity.domain;

public final class RegistrationFailure extends RuntimeException {
    public enum Code {
        INVALID_INPUT, SIGNUP_CONFLICT, SLUG_UNAVAILABLE, UNAUTHENTICATED, FORBIDDEN,
        INVALID_PROOF, EXPIRED_PROOF, RATE_LIMITED, SERVICE_UNAVAILABLE
    }

    private final Code code;
    private final String field;
    private final long retryAfterSeconds;

    public RegistrationFailure(Code code, String message) {
        this(code, message, null, 0);
    }

    public RegistrationFailure(Code code, String message, String field, long retryAfterSeconds) {
        super(message);
        this.code = code;
        this.field = field;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public Code code() { return code; }
    public String field() { return field; }
    public long retryAfterSeconds() { return retryAfterSeconds; }

    public static RegistrationFailure invalid(String field, String message) {
        return new RegistrationFailure(Code.INVALID_INPUT, message, field, 0);
    }
}
