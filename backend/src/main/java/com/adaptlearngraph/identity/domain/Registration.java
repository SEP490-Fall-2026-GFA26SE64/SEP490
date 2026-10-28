package com.adaptlearngraph.identity.domain;

import java.time.Instant;
import java.util.UUID;

public record Registration(
        UUID id, UUID accountId, RegistrationFields fields, String passwordHash, boolean active,
        State state, Instant emailVerifiedAt, Instant completedAt, long authVersion,
        boolean recoveryRequired, Instant createdAt, Instant updatedAt) {
    public enum State { EMAIL_PENDING, MFA_PENDING, REGISTERED }

    @Override
    public String toString() {
        return "Registration[id=" + id + ", state=" + state + "]";
    }
}
