package com.adaptlearngraph.repository;

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
                      long authVersion, boolean recoveryRequired, boolean hasTotp, boolean workspaceReady,
                      String workspaceSlug) {
        public Credential { roles = Set.copyOf(roles); }
        public Credential(UUID accountId, UUID organizationId, String email, String fullName, String passwordHash,
                          boolean active, boolean membershipActive, Set<String> roles, Instant emailVerifiedAt,
                          long authVersion, boolean recoveryRequired, boolean hasTotp, boolean workspaceReady) {
            this(accountId, organizationId, email, fullName, passwordHash, active, membershipActive, roles, emailVerifiedAt,
                    authVersion, recoveryRequired, hasTotp, workspaceReady, null);
        }
        public boolean requiresMfa() {
            return roles.contains("ORGANIZATION_ADMINISTRATOR");
        }
        public boolean platformAdministrator() {
            return roles.equals(Set.of("PLATFORM_ADMINISTRATOR"));
        }
        @Override public String toString() { return "WorkspaceCredential[redacted]"; }
    }
}
