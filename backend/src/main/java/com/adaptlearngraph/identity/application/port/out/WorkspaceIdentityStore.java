package com.adaptlearngraph.identity.application.port.out;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface WorkspaceIdentityStore {
    Optional<Credential> findByEmail(String email);
    Credential lock(UUID accountId);
    void completeEnrollment(UUID accountId, String encryptedSecret, long step, Instant now);
    long beginRecovery(UUID accountId, Instant now);

    record Credential(UUID accountId, UUID organizationId, String email, String fullName, String passwordHash,
                      boolean active, boolean membershipActive, Set<String> roles, Instant emailVerifiedAt,
                      long authVersion, boolean recoveryRequired, boolean hasTotp, boolean workspaceReady) {
        public Credential { roles = Set.copyOf(roles); }
        public boolean requiresMfa() {
            return roles.contains("ORGANIZATION_ADMINISTRATOR");
        }
        public boolean platformAdministrator() {
            return roles.equals(Set.of("PLATFORM_ADMINISTRATOR"));
        }
        @Override public String toString() { return "WorkspaceCredential[redacted]"; }
    }
}
