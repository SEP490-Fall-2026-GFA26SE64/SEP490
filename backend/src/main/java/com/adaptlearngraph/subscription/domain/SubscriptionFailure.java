package com.adaptlearngraph.subscription.domain;

public final class SubscriptionFailure extends RuntimeException {
    public enum Code {
        INVALID_INPUT, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT,
        CAPACITY_EXCEEDED, REFERENCE_DATA_REQUIRED, PROVIDER_UNAVAILABLE, SERVICE_UNAVAILABLE, PAYMENT_EXCEPTION
    }

    private final Code code;
    private final String field;

    public SubscriptionFailure(Code code, String message) {
        this(code, message, null);
    }

    public SubscriptionFailure(Code code, String message, String field) {
        super(message);
        this.code = code;
        this.field = field;
    }

    public Code code() { return code; }
    public String field() { return field; }
}
