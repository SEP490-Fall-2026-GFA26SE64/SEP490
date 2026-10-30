package com.adaptlearngraph.identity.domain;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record RegistrationActor(UUID accountId, Scope scope, long authVersion, Instant issuedAt)
        implements Serializable {
    public enum Scope { PASSWORD_PROVEN, EMAIL_PROVEN, RECOVERY, FULL }
}
