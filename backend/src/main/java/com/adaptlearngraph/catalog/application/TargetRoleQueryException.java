package com.adaptlearngraph.catalog.application;

import java.util.Objects;

/** Application failure mapped to the public API without exposing catalog visibility details. */
public final class TargetRoleQueryException extends RuntimeException {
    private final Code code;

    public TargetRoleQueryException(Code code, String message) {
        super(message);
        this.code = Objects.requireNonNull(code, "code must not be null");
    }

    public TargetRoleQueryException(Code code, String message, Throwable cause) {
        super(message, cause);
        this.code = Objects.requireNonNull(code, "code must not be null");
    }

    public Code code() {
        return code;
    }

    public enum Code {
        UNAUTHENTICATED,
        FORBIDDEN,
        INVALID_REQUEST,
        ROLE_NOT_AVAILABLE,
        CATALOG_UNAVAILABLE
    }
}
