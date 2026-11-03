package com.adaptlearngraph.exception;

import java.util.UUID;

/**
 * Safe initial-pathway rejection: HTTP status, stable code, retry hint and a fresh correlation id. The pathway ports
 * raise their own subtype; HTTP adapters handle this type without depending on the ports.
 */
public class InitialPathwayFailure extends RuntimeException {
    private final int status;
    private final String code;
    private final boolean retryable;
    private final UUID correlationId = UUID.randomUUID();

    public InitialPathwayFailure(int status, String code) {
        this(status, code, status == 503);
    }

    public InitialPathwayFailure(int status, String code, boolean retryable) {
        super(code);
        this.status = status;
        this.code = code;
        this.retryable = retryable;
    }

    public int status() { return status; }

    public String code() { return code; }

    public boolean retryable() { return retryable; }

    public UUID correlationId() { return correlationId; }
}