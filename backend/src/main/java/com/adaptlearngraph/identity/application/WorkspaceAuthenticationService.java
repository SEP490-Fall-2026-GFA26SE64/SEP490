package com.adaptlearngraph.identity.application;

import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.application.port.in.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.application.port.out.WorkspaceIdentityStore;
import com.adaptlearngraph.identity.application.port.out.WorkspaceIdentityStore.Credential;
import com.adaptlearngraph.identity.domain.RegistrationActor;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.RegistrationFailure.Code;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import com.adaptlearngraph.identity.domain.WorkspacePrincipal;
import com.adaptlearngraph.identity.domain.WorkspacePrincipal.Scope;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

public final class WorkspaceAuthenticationService implements WorkspaceAuthenticationUseCase {
    private final WorkspaceIdentityStore identities;
    private final RegistrationStore security;
    private final RegistrationSecrets secrets;
    private final RegistrationUseCase registration;
    private final Clock clock;
    private final AuthenticationAttemptGuard attempts;
    private final String dummyPasswordHash;

    public WorkspaceAuthenticationService(WorkspaceIdentityStore identities, RegistrationStore security,
            RegistrationSecrets secrets, RegistrationUseCase registration, Clock clock) {
        this.identities = identities;
        this.security = security;
        this.secrets = secrets;
        this.registration = registration;
        this.clock = clock;
        this.attempts = new AuthenticationAttemptGuard(security, secrets, clock);
        this.dummyPasswordHash = secrets.hashPassword(UUID.randomUUID().toString());
    }

    @Override
    public WorkspacePrincipal signIn(String email, String password, String address) {
        String normalized = RegistrationFields.normalizeEmail(email);
        if (normalized.length() > 254 || password == null || password.length() > 256) throw invalidCredentials();
        return attempts.execute("password", normalized, address, () -> {
            var found = identities.findByEmail(normalized);
            if (found.isEmpty()) {
                secrets.passwordMatches(password, dummyPasswordHash);
                throw invalidCredentials();
            }
            var account = identities.lock(found.get().accountId());
            if (!account.active() || !secrets.passwordMatches(password, account.passwordHash())
                    || account.roles().size() != 1
                    || (!account.platformAdministrator() && account.emailVerifiedAt() == null)) throw invalidCredentials();
            boolean platform = account.platformAdministrator();
            if (!platform && (!account.membershipActive() || !account.workspaceReady())) {
                throw new RegistrationFailure(Code.FORBIDDEN,
                        "No active, ready workspace membership is available. Resume onboarding or contact your administrator.");
            }
            Scope scope = account.requiresMfa()
                    ? (!account.hasTotp() && !account.recoveryRequired() ? Scope.ENROLLMENT : Scope.PASSWORD) : Scope.FULL;
            security.audit(account.accountId(), "WORKSPACE_PASSWORD_VERIFIED", "SUCCEEDED", clock.instant());
            return principal(account, scope, false);
        });
    }

    @Override
    public Identity current(WorkspacePrincipal principal) {
        return security.transaction(() -> {
            var account = require(principal);
            String stage = !account.requiresMfa() && principal.scope() != Scope.FULL ? "SIGN_IN_REQUIRED" : switch (principal.scope()) {
                case FULL -> account.requiresMfa() && !principal.mfaVerified() ? "SIGN_IN_REQUIRED" : "COMPLETE";
                case PASSWORD -> account.recoveryRequired() ? "RECOVERY_REQUIRED" : "CHALLENGE_MFA";
                case ENROLLMENT -> "SETUP_MFA";
                case RECOVERY -> "SETUP_MFA_RECOVERY";
            };
            boolean full = "COMPLETE".equals(stage);
            return new Identity(full ? account.accountId() : null, full ? account.organizationId() : null,
                    account.email(), full ? account.fullName() : null, account.active(),
                    full && account.membershipActive(), full ? account.roles() : java.util.Set.of(),
                    full && principal.mfaVerified(), full && account.workspaceReady(), stage);
        });
    }

    @Override
    public WorkspacePrincipal verifyTotp(WorkspacePrincipal principal, String code, String address) {
        if (principal == null) throw unauthenticated();
        return attempts.execute("totp", principal.accountId().toString(), address, () -> {
            var account = require(principal);
            if (!account.requiresMfa() || principal.scope() != Scope.PASSWORD || account.recoveryRequired()) throw forbidden();
            var credential = security.totp(account.accountId()).orElseThrow(WorkspaceAuthenticationService::forbidden);
            String secret = secrets.decrypt(credential.encryptedSecret(), "totp:" + account.accountId());
            long step = secrets.matchingTotpStep(secret, code, clock.instant(), credential.lastUsedStep());
            if (step < 0) throw invalidProof();
            security.acceptTotpStep(account.accountId(), step);
            security.audit(account.accountId(), "WORKSPACE_MFA_SIGN_IN", "SUCCEEDED", clock.instant());
            return principal(account, Scope.FULL, true);
        });
    }

    @Override
    public Enrollment prepareEnrollment(WorkspacePrincipal principal, String existingEncryptedSecret) {
        secrets.requireConfigured();
        return security.transaction(() -> {
            var account = requireEnrollment(principal);
            String purpose = enrollmentPurpose(principal);
            String secret = existingEncryptedSecret == null
                    ? secrets.newTotpSecret() : secrets.decrypt(existingEncryptedSecret, purpose);
            String encrypted = existingEncryptedSecret == null ? secrets.encrypt(secret, purpose) : existingEncryptedSecret;
            return new Enrollment(encrypted, secrets.authenticatorSecret(secret), account.email());
        });
    }

    @Override
    public Completion confirmEnrollment(WorkspacePrincipal principal, String encryptedSecret, String code, String address) {
        if (principal == null) throw unauthenticated();
        return attempts.execute("totp", principal.accountId().toString(), address, () -> {
            var account = requireEnrollment(principal);
            if (encryptedSecret == null) throw invalidProof();
            String secret = secrets.decrypt(encryptedSecret, enrollmentPurpose(principal));
            long step = secrets.matchingTotpStep(secret, code, clock.instant(), -1);
            if (step < 0) throw invalidProof();
            var now = clock.instant();
            var codes = new ArrayList<String>(10);
            for (int i = 0; i < 10; i++) codes.add(secrets.recoveryCode());
            identities.completeEnrollment(account.accountId(), secrets.encrypt(secret, "totp:" + account.accountId()), step, now);
            security.replaceRecoveryCodes(account.accountId(), codes.stream()
                    .map(value -> secrets.digest("recovery:" + account.accountId() + ":" + value)).toList(), now);
            security.audit(account.accountId(), "WORKSPACE_TOTP_ENROLLED", "SUCCEEDED", now);
            return new Completion(principal(identities.lock(account.accountId()), Scope.FULL, true), codes);
        });
    }

    @Override
    public WorkspacePrincipal recover(WorkspacePrincipal principal, String recoveryCode, String address) {
        if (principal == null) throw unauthenticated();
        return attempts.execute("recovery", principal.accountId().toString(), address, () -> {
            var account = require(principal);
            if (!account.requiresMfa() || principal.scope() != Scope.PASSWORD) throw forbidden();
            String code = recoveryCode == null ? "" : recoveryCode.strip().toLowerCase(Locale.ROOT);
            if (!code.matches("[a-f0-9]{32}") || !security.consumeRecoveryCode(account.accountId(),
                    secrets.digest("recovery:" + account.accountId() + ":" + code), clock.instant())) throw invalidProof();
            long version = identities.beginRecovery(account.accountId(), clock.instant());
            security.audit(account.accountId(), "WORKSPACE_TOTP_RECOVERY_STARTED", "SUCCEEDED", clock.instant());
            return new WorkspacePrincipal(account.accountId(), Scope.RECOVERY, false, version, clock.instant());
        });
    }

    @Override
    public WorkspacePrincipal fromRegistration(RegistrationActor actor) {
        if (actor == null || actor.scope() != RegistrationActor.Scope.FULL
                || !"COMPLETE".equals(registration.current(actor).stage())) throw unauthenticated();
        return security.transaction(() -> {
            var account = identities.lock(actor.accountId());
            if (!account.active() || !account.membershipActive() || !account.workspaceReady()
                    || account.authVersion() != actor.authVersion() || account.recoveryRequired()) throw forbidden();
            return principal(account, Scope.FULL, true);
        });
    }

    private Credential require(WorkspacePrincipal principal) {
        if (principal == null || !clock.instant().isBefore(principal.issuedAt().plus(
                principal.scope() == Scope.FULL ? Duration.ofHours(12) : Duration.ofMinutes(10)))) throw unauthenticated();
        var account = identities.lock(principal.accountId());
        if (!account.active() || account.roles().size() != 1 || account.authVersion() != principal.authVersion()
                || (!account.platformAdministrator() && account.emailVerifiedAt() == null)) {
            throw unauthenticated();
        }
        if (principal.scope() == Scope.FULL && account.requiresMfa() && account.recoveryRequired()) throw forbidden();
        return account;
    }

    private Credential requireEnrollment(WorkspacePrincipal principal) {
        var account = require(principal);
        if (principal.scope() == Scope.RECOVERY && account.requiresMfa() && account.recoveryRequired()) return account;
        if (principal.scope() == Scope.ENROLLMENT && account.requiresMfa()
                && !account.hasTotp() && !account.recoveryRequired()) return account;
        throw forbidden();
    }

    private WorkspacePrincipal principal(Credential account, Scope scope, boolean mfa) {
        return new WorkspacePrincipal(account.accountId(), scope, mfa, account.authVersion(), clock.instant());
    }
    private static String enrollmentPurpose(WorkspacePrincipal principal) {
        return "workspace-enrollment:" + principal.accountId() + ":" + principal.authVersion() + ":" + principal.issuedAt();
    }
    private static RegistrationFailure unauthenticated() {
        return new RegistrationFailure(Code.UNAUTHENTICATED, "Your session is missing, expired or revoked. Sign in again.");
    }
    private static RegistrationFailure invalidCredentials() {
        return new RegistrationFailure(Code.UNAUTHENTICATED, "Email or password is incorrect, or the account is unavailable.");
    }
    private static RegistrationFailure invalidProof() {
        return new RegistrationFailure(Code.INVALID_PROOF, "This authentication proof is invalid or has already been used.");
    }
    private static RegistrationFailure forbidden() {
        return new RegistrationFailure(Code.FORBIDDEN, "This operation is not permitted for the current authentication stage.");
    }
}
