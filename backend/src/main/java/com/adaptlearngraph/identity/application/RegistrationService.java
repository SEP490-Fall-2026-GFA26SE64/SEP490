package com.adaptlearngraph.identity.application;

import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.application.port.out.RegistrationDelivery;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore.EmailProof;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore.RateBucket;
import com.adaptlearngraph.identity.domain.Registration;
import com.adaptlearngraph.identity.domain.Registration.State;
import com.adaptlearngraph.identity.domain.RegistrationActor;
import com.adaptlearngraph.identity.domain.RegistrationActor.Scope;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.RegistrationFailure.Code;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import com.adaptlearngraph.shared.domain.IntegrationPolicy;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

public final class RegistrationService implements RegistrationUseCase {
    private final RegistrationStore store;
    private final RegistrationSecrets secrets;
    private final RegistrationDelivery delivery;
    private final Clock clock;
    private final String dummyPasswordHash;
    private final AuthenticationAttemptGuard attempts;
    private final IntegrationPolicy policy;

    public RegistrationService(RegistrationStore store, RegistrationSecrets secrets,
                               RegistrationDelivery delivery, Clock clock) {
        this(store, secrets, delivery, clock, IntegrationPolicy.ENABLED);
    }

    public RegistrationService(RegistrationStore store, RegistrationSecrets secrets,
                               RegistrationDelivery delivery, Clock clock, IntegrationPolicy policy) {
        this.store = store;
        this.secrets = secrets;
        this.delivery = delivery;
        this.clock = clock;
        this.policy = policy;
        this.dummyPasswordHash = secrets.hashPassword(UUID.randomUUID().toString());
        this.attempts = new AuthenticationAttemptGuard(store, secrets, clock);
    }

    @Override
    public RegistrationActor register(RegistrationFields fields, String password, String address) {
        requireReadyForEmail();
        RegistrationFields.validatePassword(password);
        consumeRequestLimit("signup:" + address, 10, Duration.ofHours(1));
        String passwordHash = secrets.hashPassword(password);
        return store.transaction(() -> {
            store.lockEmail(fields.adminEmail());
            if (store.accountExists(fields.adminEmail())) {
                throw new RegistrationFailure(Code.SIGNUP_CONFLICT,
                        "Registration cannot be created with these details. Sign in to resume an existing registration.");
            }
            Instant now = clock.instant();
            UUID accountId = UUID.randomUUID();
            UUID registrationId = UUID.randomUUID();
            store.insertAccount(accountId, fields.adminEmail(), passwordHash, now);
            boolean inserted = false;
            for (int attempt = 0; attempt < 10 && !inserted; attempt++) {
                String slug = fields.subdomain() == null
                        ? fields.generatedSlug(secrets.randomSlugSuffix()) : fields.subdomain();
                inserted = store.insertRegistration(registrationId, accountId, fields, slug, now);
                if (!inserted && fields.subdomain() != null) {
                    throw new RegistrationFailure(Code.SLUG_UNAVAILABLE,
                            "This workspace slug is already reserved. Choose another or leave it empty.", "subdomain", 0);
                }
            }
            if (!inserted) throw new RegistrationFailure(Code.SERVICE_UNAVAILABLE, "Unable to reserve a slug. Try again.");
            if (policy.emailVerificationEnabled()) queueVerification(accountId, address, now);
            store.audit(accountId, "REGISTRATION_CREATED", "SUCCEEDED", now);
            return progressActor(store.lockRegistration(accountId),
                    new RegistrationActor(accountId, Scope.PASSWORD_PROVEN, 0, now, false));
        });
    }

    @Override
    public RegistrationActor signIn(String email, String password, String address) {
        secrets.requireConfigured();
        String normalized = RegistrationFields.normalizeEmail(email);
        if (normalized.length() > 254 || password == null || password.length() > 256) throw invalidCredentials();
        return securityAttempt("password", normalized, address, () -> {
            var found = store.findByEmail(normalized);
            if (found.isEmpty()) {
                secrets.passwordMatches(password, dummyPasswordHash);
                throw invalidCredentials();
            }
            Registration registration = store.lockRegistration(found.get().accountId());
            if (!secrets.passwordMatches(password, registration.passwordHash()) || !registration.active()) {
                throw invalidCredentials();
            }
            store.audit(registration.accountId(), "REGISTRATION_PASSWORD_VERIFIED", "SUCCEEDED", clock.instant());
            return progressActor(registration, actor(registration, Scope.PASSWORD_PROVEN));
        });
    }

    @Override
    public View current(RegistrationActor actor) {
        secrets.requireConfigured();
        return store.transaction(() -> {
            Registration registration = requireActor(actor);
            Scope scope = effectiveScope(registration, actor);
            synchronizeState(registration);
            registration = store.lockRegistration(actor.accountId());
            boolean full = scope == Scope.FULL;
            String stage = switch (scope) {
                case FULL -> "COMPLETE";
                case RECOVERY -> "SETUP_MFA_RECOVERY";
                case EMAIL_PROVEN -> "SETUP_MFA";
                case PASSWORD_PROVEN -> registration.state() == State.REGISTERED
                        ? (registration.recoveryRequired() ? "RECOVERY_REQUIRED" : "CHALLENGE_MFA") : "VERIFY_EMAIL";
            };
            Instant resendAt = store.emailProof(registration.accountId()).map(proof ->
                    proof.sendsInWindow() >= 5 && clock.instant().isBefore(proof.windowStartedAt().plusSeconds(3600))
                            ? proof.windowStartedAt().plusSeconds(3600) : proof.lastSentAt().plusSeconds(60))
                    .orElse(null);
            return new View(full ? registration.id() : null, stage, registration.fields().adminEmail(),
                    full ? registration.fields() : null, store.deliveryStatus(registration.accountId()),
                    resendAt, registration.emailVerifiedAt(), full ? registration.completedAt() : null);
        });
    }

    @Override
    public void resend(RegistrationActor actor, String address) {
        if (!policy.emailVerificationEnabled()) throw forbidden();
        requireReadyForEmail();
        store.transaction(() -> {
            Registration registration = requireActor(actor, Scope.PASSWORD_PROVEN);
            if (registration.emailVerifiedAt() != null && registration.state() == State.REGISTERED) throw forbidden();
            queueVerification(registration.accountId(), address, clock.instant());
            store.audit(registration.accountId(), "REGISTRATION_EMAIL_REQUESTED", "SUCCEEDED", clock.instant());
            return null;
        });
    }

    @Override
    public RegistrationActor verifyEmail(RegistrationActor actor, String code, String address) {
        if (!policy.emailVerificationEnabled()) throw forbidden();
        return actorAttempt("email", actor, address, () -> {
            Registration registration = requireActor(actor, Scope.PASSWORD_PROVEN);
            if (registration.emailVerifiedAt() != null && registration.state() == State.REGISTERED) throw forbidden();
            EmailProof proof = store.emailProof(actor.accountId()).orElseThrow(RegistrationService::invalidProof);
            if (proof.consumedAt() != null) throw invalidProof();
            if (!clock.instant().isBefore(proof.expiresAt())) {
                throw new RegistrationFailure(Code.EXPIRED_PROOF, "The email code expired. Request a new code.");
            }
            if (code == null || !code.matches("[0-9]{6}")
                    || !secrets.matchesDigest(emailContext(actor.accountId(), proof.generation()) + ":" + code, proof.hmac())) {
                throw invalidProof();
            }
            store.consumeEmailProof(actor.accountId(), clock.instant());
            store.markEmailVerified(actor.accountId(), clock.instant());
            store.audit(actor.accountId(), "REGISTRATION_EMAIL_VERIFIED", "SUCCEEDED", clock.instant());
            return progressActor(store.lockRegistration(actor.accountId()), actor(registration, Scope.EMAIL_PROVEN));
        });
    }

    @Override
    public Enrollment prepareEnrollment(RegistrationActor actor, String existingEncryptedSecret) {
        if (!policy.mfaEnabled()) throw forbidden();
        secrets.requireConfigured();
        return store.transaction(() -> {
            Registration registration = requireEnrollmentActor(actor);
            String purpose = enrollmentPurpose(actor);
            String secret = existingEncryptedSecret == null
                    ? secrets.newTotpSecret() : secrets.decrypt(existingEncryptedSecret, purpose);
            String encrypted = existingEncryptedSecret == null ? secrets.encrypt(secret, purpose) : existingEncryptedSecret;
            return new Enrollment(encrypted, secrets.authenticatorSecret(secret), registration.fields().adminEmail());
        });
    }

    @Override
    public Completion confirmEnrollment(RegistrationActor actor, String encryptedSecret, String code, String address) {
        if (!policy.mfaEnabled()) throw forbidden();
        return actorAttempt("totp", actor, address, () -> {
            requireEnrollmentActor(actor);
            if (encryptedSecret == null) throw new RegistrationFailure(Code.INVALID_PROOF, "Set up your authenticator first.");
            String secret = secrets.decrypt(encryptedSecret, enrollmentPurpose(actor));
            long step = secrets.matchingTotpStep(secret, code, clock.instant(), -1);
            if (step < 0) throw invalidProof();
            Instant now = clock.instant();
            List<String> codes = new ArrayList<>(10);
            for (int i = 0; i < 10; i++) codes.add(secrets.recoveryCode());
            store.completeEnrollment(actor.accountId(), secrets.encrypt(secret, "totp:" + actor.accountId()), step, now);
            store.replaceRecoveryCodes(actor.accountId(), codes.stream().map(value ->
                    secrets.digest("recovery:" + actor.accountId() + ":" + value)).toList(), now);
            store.audit(actor.accountId(), actor.scope() == Scope.RECOVERY ? "TOTP_REENROLLED" : "TOTP_ENROLLED",
                    "SUCCEEDED", now);
            return new Completion(actor(store.lockRegistration(actor.accountId()), Scope.FULL), codes);
        });
    }

    @Override
    public RegistrationActor verifyTotp(RegistrationActor actor, String code, String address) {
        if (!policy.mfaEnabled()) throw forbidden();
        return actorAttempt("totp", actor, address, () -> {
            Registration registration = requireActor(actor, Scope.PASSWORD_PROVEN);
            if (registration.state() != State.REGISTERED || registration.recoveryRequired()) throw forbidden();
            var credential = store.totp(actor.accountId()).orElseThrow(RegistrationService::forbidden);
            String secret = secrets.decrypt(credential.encryptedSecret(), "totp:" + actor.accountId());
            long step = secrets.matchingTotpStep(secret, code, clock.instant(), credential.lastUsedStep());
            if (step < 0) throw new RegistrationFailure(Code.INVALID_PROOF,
                    "Invalid or already used authenticator code. Wait for a new code and try again.");
            store.acceptTotpStep(actor.accountId(), step);
            store.audit(actor.accountId(), "REGISTRATION_MFA_SIGN_IN", "SUCCEEDED", clock.instant());
            return actor(registration, Scope.FULL);
        });
    }

    @Override
    public RegistrationActor recover(RegistrationActor actor, String recoveryCode, String address) {
        if (!policy.mfaEnabled()) throw forbidden();
        return actorAttempt("recovery", actor, address, () -> {
            Registration registration = requireActor(actor, Scope.PASSWORD_PROVEN);
            if (registration.state() != State.REGISTERED) throw forbidden();
            String code = recoveryCode == null ? "" : recoveryCode.strip().toLowerCase(java.util.Locale.ROOT);
            if (!code.matches("[a-f0-9]{32}") || !store.consumeRecoveryCode(actor.accountId(),
                    secrets.digest("recovery:" + actor.accountId() + ":" + code), clock.instant())) throw invalidProof();
            long version = store.beginRecovery(actor.accountId(), clock.instant());
            store.audit(actor.accountId(), "TOTP_RECOVERY_STARTED", "SUCCEEDED", clock.instant());
            return new RegistrationActor(actor.accountId(), Scope.RECOVERY, version, clock.instant());
        });
    }

    private Registration requireEnrollmentActor(RegistrationActor actor) {
        Registration registration = requireActor(actor, Scope.EMAIL_PROVEN, Scope.RECOVERY);
        synchronizeState(registration);
        registration = store.lockRegistration(actor.accountId());
        if (effectiveScope(registration, actor) == Scope.EMAIL_PROVEN && registration.state() != State.MFA_PENDING) throw forbidden();
        if (actor.scope() == Scope.RECOVERY && !registration.recoveryRequired()) throw forbidden();
        return registration;
    }

    private Registration requireActor(RegistrationActor actor, Scope... allowed) {
        if (actor == null) throw new RegistrationFailure(Code.UNAUTHENTICATED, "Sign in to resume registration.");
        Duration lifetime = actor.scope() == Scope.FULL ? Duration.ofHours(12) : Duration.ofMinutes(10);
        if (!clock.instant().isBefore(actor.issuedAt().plus(lifetime))) {
            throw new RegistrationFailure(Code.UNAUTHENTICATED, "Your session expired. Sign in again.");
        }
        Registration registration = store.lockRegistration(actor.accountId());
        if (!registration.active() || registration.authVersion() != actor.authVersion()) {
            throw new RegistrationFailure(Code.UNAUTHENTICATED, "Your session was revoked. Sign in again.");
        }
        if (allowed.length > 0 && !List.of(allowed).contains(effectiveScope(registration, actor))) throw forbidden();
        return registration;
    }

    private Scope effectiveScope(Registration registration, RegistrationActor actor) {
        if (policy.emailVerificationEnabled() && registration.emailVerifiedAt() == null) return Scope.PASSWORD_PROVEN;
        if (policy.emailVerificationEnabled() && actor.scope() == Scope.PASSWORD_PROVEN
                && registration.state() != State.REGISTERED) return Scope.PASSWORD_PROVEN;
        if (!policy.mfaEnabled()) return Scope.FULL;
        if (actor.scope() == Scope.RECOVERY && registration.recoveryRequired()) return Scope.RECOVERY;
        boolean enrolled = store.totp(registration.accountId()).isPresent();
        if (!enrolled && !registration.recoveryRequired()) return Scope.EMAIL_PROVEN;
        return actor.scope() == Scope.FULL && actor.mfaVerified() && !registration.recoveryRequired()
                ? Scope.FULL : Scope.PASSWORD_PROVEN;
    }

    private void synchronizeState(Registration registration) {
        boolean emailBypassed = !policy.emailVerificationEnabled() && registration.emailVerifiedAt() == null;
        State state = !emailBypassed && registration.emailVerifiedAt() == null ? State.EMAIL_PENDING
                : !policy.mfaEnabled() || store.totp(registration.accountId()).isPresent()
                    ? State.REGISTERED : State.MFA_PENDING;
        store.updateVerificationState(registration.accountId(), state, emailBypassed, !policy.mfaEnabled(), clock.instant());
    }

    private RegistrationActor progressActor(Registration registration, RegistrationActor actor) {
        synchronizeState(registration);
        return new RegistrationActor(actor.accountId(), effectiveScope(registration, actor),
                registration.authVersion(), clock.instant(), actor.mfaVerified());
    }

    private void queueVerification(UUID accountId, String address, Instant now) {
        EmailProof previous = store.emailProof(accountId).orElse(null);
        if (previous != null && now.isBefore(previous.lastSentAt().plusSeconds(60))) {
            throw limited(previous.lastSentAt().plusSeconds(60), now);
        }
        boolean sameWindow = previous != null && now.isBefore(previous.windowStartedAt().plusSeconds(3600));
        if (sameWindow && previous.sendsInWindow() >= 5) throw limited(previous.windowStartedAt().plusSeconds(3600), now);
        consumeRequestLimit("email-send:" + address, 20, Duration.ofHours(1));
        long generation = previous == null ? 1 : previous.generation() + 1;
        String code = secrets.emailCode();
        String context = emailContext(accountId, generation);
        store.saveEmailProof(accountId, new EmailProof(secrets.digest(context + ":" + code), generation,
                now.plusSeconds(600), null, now, sameWindow ? previous.windowStartedAt() : now,
                sameWindow ? previous.sendsInWindow() + 1 : 1));
        store.queueEmail(accountId, generation, secrets.encrypt(code, context), now);
    }

    private <T> T actorAttempt(String operation, RegistrationActor actor, String address, Supplier<T> action) {
        if (actor == null) throw new RegistrationFailure(Code.UNAUTHENTICATED, "Sign in to continue.");
        return securityAttempt(operation, actor.accountId().toString(), address, action);
    }

    private <T> T securityAttempt(String operation, String identity, String address, Supplier<T> action) {
        return attempts.execute(operation, identity, address, action);
    }

    private void consumeRequestLimit(String label, int limit, Duration window) {
        store.transaction(() -> {
            Instant now = clock.instant();
            String key = secrets.digest("rate:" + label);
            RateBucket bucket = currentBucket(store.lockRate(key, now), now, window);
            if (bucket.attempts() >= limit) throw limited(bucket.windowStartedAt().plus(window), now);
            store.saveRate(key, new RateBucket(bucket.windowStartedAt(), bucket.attempts() + 1, null));
            return null;
        });
    }

    private static RateBucket currentBucket(RateBucket bucket, Instant now, Duration window) {
        if (bucket.blockedUntil() != null && now.isBefore(bucket.blockedUntil())) return bucket;
        return now.isBefore(bucket.windowStartedAt().plus(window)) ? bucket : new RateBucket(now, 0, null);
    }

    private RegistrationActor actor(Registration registration, Scope scope) {
        return new RegistrationActor(registration.accountId(), scope, registration.authVersion(), clock.instant());
    }

    private void requireReadyForEmail() {
        secrets.requireConfigured();
        if (policy.emailVerificationEnabled()) delivery.requireConfigured();
    }

    private static String enrollmentPurpose(RegistrationActor actor) {
        return "enrollment:" + actor.accountId() + ":" + actor.authVersion() + ":" + actor.issuedAt();
    }

    private static String emailContext(UUID accountId, long generation) {
        return "email:" + accountId + ":" + generation;
    }

    private static RegistrationFailure limited(Instant until, Instant now) {
        return new RegistrationFailure(Code.RATE_LIMITED, "Too many attempts. Wait before trying again.", null,
                Math.max(1, Duration.between(now, until).toSeconds()));
    }

    private static RegistrationFailure invalidCredentials() {
        return new RegistrationFailure(Code.UNAUTHENTICATED, "Email or password is incorrect, or registration is unavailable.");
    }

    private static RegistrationFailure invalidProof() {
        return new RegistrationFailure(Code.INVALID_PROOF, "This verification code is invalid or has already been used.");
    }

    private static RegistrationFailure forbidden() {
        return new RegistrationFailure(Code.FORBIDDEN, "Complete the required verification step before continuing.");
    }

}
