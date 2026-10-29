package com.adaptlearngraph.identity.domain;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record WorkspacePrincipal(UUID accountId, Scope scope, boolean mfaVerified,
                                 long authVersion, Instant issuedAt) implements Serializable {
    public enum Scope { PASSWORD, ENROLLMENT, RECOVERY, FULL }
}
