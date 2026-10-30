package com.adaptlearngraph.identity.application.port.in;

import com.adaptlearngraph.identity.domain.RegistrationActor;
import com.adaptlearngraph.identity.domain.WorkspacePrincipal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface WorkspaceAuthenticationUseCase {
    WorkspacePrincipal signIn(String email, String password, String address);
    Identity current(WorkspacePrincipal principal);
    WorkspacePrincipal verifyTotp(WorkspacePrincipal principal, String code, String address);
    Enrollment prepareEnrollment(WorkspacePrincipal principal, String existingEncryptedSecret);
    Completion confirmEnrollment(WorkspacePrincipal principal, String encryptedSecret, String code, String address);
    WorkspacePrincipal recover(WorkspacePrincipal principal, String code, String address);
    WorkspacePrincipal fromRegistration(RegistrationActor actor);

    record Identity(UUID accountId, UUID organizationId, String email, String fullName,
                    boolean accountActive, boolean membershipActive, Set<String> roles,
                    boolean mfaVerified, boolean workspaceReady, String stage) {
        public Identity { roles = Set.copyOf(roles); }
    }
    record Enrollment(String encryptedSecret, String manualSecret, String email) {
        @Override public String toString() { return "WorkspaceEnrollment[redacted]"; }
    }
    record Completion(WorkspacePrincipal principal, List<String> recoveryCodes) {
        public Completion { recoveryCodes = List.copyOf(recoveryCodes); }
        @Override public String toString() { return "WorkspaceCompletion[redacted]"; }
    }
}
