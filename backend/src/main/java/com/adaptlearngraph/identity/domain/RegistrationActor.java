package com.adaptlearngraph.identity.domain;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record RegistrationActor(UUID accountId, Scope scope, long authVersion, Instant issuedAt, boolean mfaVerified)
        implements Serializable {
    public RegistrationActor(UUID accountId, Scope scope, long authVersion, Instant issuedAt) {
        this(accountId, scope, authVersion, issuedAt, scope == Scope.FULL);
    }
    public enum Scope { PASSWORD_PROVEN, EMAIL_PROVEN, RECOVERY, FULL }
}
