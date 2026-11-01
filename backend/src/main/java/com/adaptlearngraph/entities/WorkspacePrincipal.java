package com.adaptlearngraph.entities;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record WorkspacePrincipal(UUID accountId, Scope scope, boolean mfaVerified,
                                 long authVersion, Instant issuedAt) implements Serializable {
    public enum Scope { PASSWORD, ENROLLMENT, RECOVERY, FULL }
}
