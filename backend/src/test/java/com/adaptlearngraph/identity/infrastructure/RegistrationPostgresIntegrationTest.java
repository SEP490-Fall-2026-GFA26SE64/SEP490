package com.adaptlearngraph.identity.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.adaptlearngraph.identity.application.RegistrationService;
import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase.Completion;
import com.adaptlearngraph.identity.domain.RegistrationActor;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.RegistrationFailure.Code;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import javax.crypto.spec.SecretKeySpec;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mail.MailSendException;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

class RegistrationPostgresIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final String PASSWORD = "correct registration password";
    private JdbcTemplate jdbc;
    private JdbcRegistrationStore store;
    private RegistrationCryptography crypto;
    private RegistrationService service;
    private MutableClock clock;
    private String address;

    @BeforeAll
    static void startDatabase() {
        POSTGRES.start();
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration").load().migrate();
    }

    @AfterAll
    static void stopDatabase() { POSTGRES.stop(); }

    @BeforeEach
    void setUp() {
        var source = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        jdbc = new JdbcTemplate(source);
        store = new JdbcRegistrationStore(jdbc, new TransactionTemplate(new DataSourceTransactionManager(source)));
        crypto = new RegistrationCryptography(key('e'), key('h'));
        clock = new MutableClock();
        service = new RegistrationService(store, crypto, () -> {}, clock);
        address = UUID.randomUUID().toString();
    }

    @Test
    void commitsEveryFieldAndPreservesNullsWithoutProvisioning() {
        String email = email();
        var fields = new RegistrationFields("Acme Learning", null, "Software Engineering & AI",
                "51 - 200 employees", "Test Owner", email);
        var actor = service.register(fields, PASSWORD, address);
        var saved = store.transaction(() -> store.lockRegistration(actor.accountId()));
        assertThat(saved.fields().organizationName()).isEqualTo("Acme Learning");
        assertThat(saved.fields().subdomain()).matches("acme-learning-[a-z0-9]{6}");
        assertThat(saved.fields().industry()).isEqualTo(fields.industry());
        assertThat(saved.fields().headcount()).isEqualTo(fields.headcount());
        assertThat(saved.fields().adminName()).isEqualTo("Test Owner");
        assertThat(saved.fields().adminEmail()).isEqualTo(email);
        assertThat(saved.emailVerifiedAt()).isNull();
        assertThat(saved.completedAt()).isNull();
        assertThat(saved.createdAt()).isEqualTo(clock.instant());
        assertThat(crypto.passwordMatches(PASSWORD, saved.passwordHash())).isTrue();
        assertThat(jdbc.queryForMap("SELECT organization_id, unit_id FROM platform.account WHERE account_id = ?",
                actor.accountId())).containsEntry("organization_id", null).containsEntry("unit_id", null);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.account_role WHERE account_id = ?",
                Integer.class, actor.accountId())).isZero();
        assertThat(service.current(actor).fields()).isNull();

        var nullable = service.register(fields(email(), null), PASSWORD, address);
        var optional = store.transaction(() -> store.lockRegistration(nullable.accountId()));
        assertThat(optional.fields().industry()).isNull();
        assertThat(optional.fields().headcount()).isNull();
        assertThat(jdbc.queryForObject("""
                SELECT payload::text FROM platform.outbox_event WHERE aggregate_id = ?
                """, String.class, actor.accountId())).doesNotContain(emailCode(actor), PASSWORD);
    }

    @Test
    void concurrentSignupCreatesOnlyOneAccountAndRegistration() throws Exception {
        String email = email();
        var calls = new ArrayList<Callable<String>>();
        for (int i = 0; i < 4; i++) {
            calls.add(() -> {
                try {
                    service.register(fields(email, null), PASSWORD, address);
                    return "CREATED";
                } catch (RegistrationFailure failure) {
                    return failure.code().name();
                }
            });
        }
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var results = executor.invokeAll(calls);
            var outcomes = new ArrayList<String>();
            for (var result : results) outcomes.add(result.get());
            assertThat(outcomes).containsExactlyInAnyOrder("CREATED", "SIGNUP_CONFLICT", "SIGNUP_CONFLICT", "SIGNUP_CONFLICT");
        }
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM platform.account a JOIN platform.organization_registration r USING(account_id)
                WHERE a.normalized_identifier = ?
                """, Integer.class, email)).isEqualTo(1);
        assertThatThrownBy(() -> service.register(fields(email.toUpperCase(), null), PASSWORD, address))
                .isInstanceOfSatisfying(RegistrationFailure.class, failure -> assertThat(failure.code()).isEqualTo(Code.SIGNUP_CONFLICT));
    }

    @Test
    void suppliedSlugConflictRollsBackNewAccount() {
        String slug = "chosen-" + UUID.randomUUID().toString().substring(0, 8);
        service.register(fields(email(), slug), PASSWORD, address);
        String conflictingEmail = email();
        assertThatThrownBy(() -> service.register(fields(conflictingEmail, slug), PASSWORD, address))
                .isInstanceOfSatisfying(RegistrationFailure.class, failure -> assertThat(failure.code()).isEqualTo(Code.SLUG_UNAVAILABLE));
        assertThat(store.accountExists(conflictingEmail)).isFalse();
    }

    @Test
    void generatedSlugCollisionsRetryAndExhaustionRollsBackTheAccount() {
        service.register(fields(email(), "acme-learning-fixed1"), PASSWORD, address);
        var controlled = spy(crypto);
        doReturn("fixed1", "fresh2").when(controlled).randomSlugSuffix();
        var collisionService = new RegistrationService(store, controlled, () -> {}, clock);
        var actor = collisionService.register(fields(email(), null), PASSWORD, address);
        assertThat(store.transaction(() -> store.lockRegistration(actor.accountId())).fields().subdomain())
                .isEqualTo("acme-learning-fresh2");
        doReturn("fixed1").when(controlled).randomSlugSuffix();
        String exhaustedEmail = email();
        assertFailure(Code.SERVICE_UNAVAILABLE,
                () -> collisionService.register(fields(exhaustedEmail, null), PASSWORD, address));
        assertThat(store.accountExists(exhaustedEmail)).isFalse();
    }

    @Test
    void roundTripsEveryAllowedIndustryAndHeadcountWithoutInferringOtherFields() {
        for (String industry : RegistrationFields.INDUSTRIES) {
            var actor = service.register(new RegistrationFields("All Industries", null, industry, null,
                    "Test Owner", email()), PASSWORD, address);
            var saved = store.transaction(() -> store.lockRegistration(actor.accountId()));
            assertThat(saved.fields().industry()).isEqualTo(industry);
            assertThat(saved.fields().headcount()).isNull();
        }
        for (String headcount : RegistrationFields.HEADCOUNTS) {
            var actor = service.register(new RegistrationFields("All Headcounts", null, null, headcount,
                    "Test Owner", email()), PASSWORD, address);
            var saved = store.transaction(() -> store.lockRegistration(actor.accountId()));
            assertThat(saved.fields().headcount()).isEqualTo(headcount);
            assertThat(saved.fields().industry()).isNull();
        }
    }

    @Test
    void resendInvalidatesPreviousProofAndEnforcesCooldownAndHourlyLimit() {
        var actor = service.register(fields(email(), null), PASSWORD, address);
        String original = emailCode(actor);
        assertFailure(Code.RATE_LIMITED, () -> service.resend(actor, address));
        clock.advance(60);
        service.resend(actor, address);
        assertFailure(Code.INVALID_PROOF, () -> service.verifyEmail(actor, original, address));
        for (int i = 0; i < 3; i++) {
            clock.advance(60);
            service.resend(actor, address);
        }
        clock.advance(60);
        assertFailure(Code.RATE_LIMITED, () -> service.resend(actor, address));
        assertThat(store.emailProof(actor.accountId()).orElseThrow().sendsInWindow()).isEqualTo(5);
        assertThat(service.verifyEmail(actor, emailCode(actor), address).scope()).isEqualTo(RegistrationActor.Scope.EMAIL_PROVEN);
        assertFailure(Code.INVALID_PROOF, () -> service.verifyEmail(actor, emailCode(actor), address));
    }

    @Test
    void expiresProofAndPersistsFailedAttemptLimitsAcrossServiceRestart() {
        String email = email();
        var actor = service.register(fields(email, null), PASSWORD, address);
        String code = emailCode(actor);
        clock.advance(600);
        assertFailure(Code.UNAUTHENTICATED, () -> service.current(actor));
        var fresh = service.signIn(email, PASSWORD, address);
        assertFailure(Code.EXPIRED_PROOF, () -> service.verifyEmail(fresh, code, address));
        service.resend(fresh, address);
        String wrong = emailCode(fresh).equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 3; i++) assertFailure(Code.INVALID_PROOF, () -> service.verifyEmail(fresh, wrong, address));
        assertFailure(Code.RATE_LIMITED, () -> service.verifyEmail(fresh, wrong, address));
        service = new RegistrationService(store, crypto, () -> {}, clock);
        assertFailure(Code.RATE_LIMITED, () -> service.verifyEmail(fresh, emailCode(fresh), address));
    }

    @Test
    void requiresEmailThenMfaAndRestoresSavedRegistrationAfterNewSignIn() throws Exception {
        String email = email();
        var initial = service.register(fields(email, null), PASSWORD, address);
        assertFailure(Code.FORBIDDEN, () -> service.prepareEnrollment(initial, null));
        var proven = service.verifyEmail(initial, emailCode(initial), address);
        var otherSession = service.signIn(email, PASSWORD, address);
        assertThat(service.current(otherSession).stage()).isEqualTo("VERIFY_EMAIL");
        assertFailure(Code.FORBIDDEN, () -> service.prepareEnrollment(otherSession, null));
        var enrollment = service.prepareEnrollment(proven, null);
        String secret = enrollmentSecret(proven, enrollment.encryptedSecret());
        String code = totp(secret);
        Completion completion = service.confirmEnrollment(proven, enrollment.encryptedSecret(), code, address);
        assertThat(completion.recoveryCodes()).hasSize(10).doesNotHaveDuplicates();
        assertThat(service.current(completion.actor()).stage()).isEqualTo("COMPLETE");
        assertThat(service.current(completion.actor()).fields().adminEmail()).isEqualTo(email);
        assertFailure(Code.UNAUTHENTICATED, () -> service.current(initial));
        var signIn = service.signIn(email, PASSWORD, address);
        assertThat(service.current(signIn).fields()).isNull();
        assertFailure(Code.INVALID_PROOF, () -> service.verifyTotp(signIn, code, address));
        clock.advance(30);
        var resumed = service.verifyTotp(signIn, totp(secret), address);
        assertThat(service.current(resumed).fields().headcount()).isNull();
        assertThat(service.current(resumed).registrationId()).isEqualTo(service.current(completion.actor()).registrationId());
        clock.advance(12 * 3600);
        assertFailure(Code.UNAUTHENTICATED, () -> service.current(resumed));
    }

    @Test
    void recoveryRevokesSessionsAndReplacesOldFactorsAndRecoveryCodes() throws Exception {
        String email = email();
        var initial = service.register(fields(email, null), PASSWORD, address);
        var verified = service.verifyEmail(initial, emailCode(initial), address);
        var enrollment = service.prepareEnrollment(verified, null);
        String oldSecret = enrollmentSecret(verified, enrollment.encryptedSecret());
        var completed = service.confirmEnrollment(verified, enrollment.encryptedSecret(), totp(oldSecret), address);
        var passwordActor = service.signIn(email, PASSWORD, address);
        var recovery = service.recover(passwordActor, completed.recoveryCodes().getFirst(), address);
        assertFailure(Code.UNAUTHENTICATED, () -> service.current(completed.actor()));
        assertFailure(Code.UNAUTHENTICATED, () -> service.recover(passwordActor, completed.recoveryCodes().get(1), address));
        var fresh = service.signIn(email, PASSWORD, address);
        assertFailure(Code.INVALID_PROOF, () -> service.recover(fresh, completed.recoveryCodes().getFirst(), address));
        assertFailure(Code.FORBIDDEN, () -> service.verifyTotp(fresh, "123456", address));
        var replacement = service.prepareEnrollment(recovery, null);
        String newSecret = enrollmentSecret(recovery, replacement.encryptedSecret());
        var recovered = service.confirmEnrollment(recovery, replacement.encryptedSecret(), totp(newSecret), address);
        assertThat(service.current(recovered.actor()).stage()).isEqualTo("COMPLETE");
        var newSignIn = service.signIn(email, PASSWORD, address);
        assertFailure(Code.INVALID_PROOF, () -> service.recover(newSignIn, completed.recoveryCodes().get(1), address));
        clock.advance(30);
        assertFailure(Code.INVALID_PROOF, () -> service.verifyTotp(newSignIn, totp(oldSecret), address));
        assertThat(service.verifyTotp(newSignIn, totp(newSecret), address).scope()).isEqualTo(RegistrationActor.Scope.FULL);
    }

    @Test
    void concurrentTotpAndRecoveryProofsEachSucceedOnlyOnce() throws Exception {
        String email = email();
        var initial = service.register(fields(email, null), PASSWORD, address);
        var proven = service.verifyEmail(initial, emailCode(initial), address);
        var enrollment = service.prepareEnrollment(proven, null);
        String secret = enrollmentSecret(proven, enrollment.encryptedSecret());
        var completed = service.confirmEnrollment(proven, enrollment.encryptedSecret(), totp(secret), address);
        clock.advance(30);
        var first = service.signIn(email, PASSWORD, address);
        var second = service.signIn(email, PASSWORD, address);
        String currentCode = totp(secret);
        assertThat(concurrently(
                () -> service.verifyTotp(first, currentCode, address),
                () -> service.verifyTotp(second, currentCode, address)))
                .containsExactlyInAnyOrder("FULL", "INVALID_PROOF");
        assertThat(concurrently(
                () -> service.recover(first, completed.recoveryCodes().getFirst(), address),
                () -> service.recover(second, completed.recoveryCodes().getFirst(), address)))
                .containsExactlyInAnyOrder("RECOVERY", "UNAUTHENTICATED");
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM platform.account_recovery_code WHERE account_id = ? AND consumed_at IS NOT NULL
                """, Integer.class, first.accountId())).isEqualTo(1);
        assertFailure(Code.UNAUTHENTICATED, () -> service.current(completed.actor()));
    }

    @Test
    void enforcesAccountAndSharedIpFailuresAndRestoresAccessAfterExactCooldown() {
        String email = email();
        service.register(fields(email, null), PASSWORD, address);
        for (int i = 0; i < 4; i++)
            assertFailure(Code.UNAUTHENTICATED, () -> service.signIn(email, "wrong", address));
        assertFailure(Code.RATE_LIMITED, () -> service.signIn(email, "wrong", address));
        clock.advance(899);
        assertFailure(Code.RATE_LIMITED, () -> service.signIn(email, PASSWORD, address));
        clock.advance(1);
        assertThat(service.signIn(email, PASSWORD, address).scope()).isEqualTo(RegistrationActor.Scope.PASSWORD_PROVEN);

        String sharedIp = UUID.randomUUID().toString();
        for (int i = 0; i < 19; i++)
            assertFailure(Code.UNAUTHENTICATED, () -> service.signIn(email(), PASSWORD, sharedIp));
        assertFailure(Code.RATE_LIMITED, () -> service.signIn(email(), PASSWORD, sharedIp));
        assertFailure(Code.RATE_LIMITED, () -> service.signIn(email, PASSWORD, sharedIp));
        clock.advance(900);
        assertThat(service.signIn(email, PASSWORD, sharedIp).accountId()).isNotNull();
    }

    @Test
    void enforcesTenSignupAndTwentyEmailRequestsPerIpPerHour() {
        var actors = new ArrayList<RegistrationActor>();
        for (int i = 0; i < 10; i++) actors.add(service.register(fields(email(), null), PASSWORD, address));
        assertFailure(Code.RATE_LIMITED, () -> service.register(fields(email(), null), PASSWORD, address));
        clock.advance(60);
        for (var actor : actors) service.resend(actor, address);
        clock.advance(60);
        assertFailure(Code.RATE_LIMITED, () -> service.resend(actors.getFirst(), address));
        clock.advance(3480);
        assertThat(service.register(fields(email(), null), PASSWORD, address).accountId()).isNotNull();
    }

    @Test
    void smtpFailurePreservesRegistrationAndRetriesSuccessfully() throws Exception {
        var mail = mock(RegistrationMailDelivery.class);
        var worker = isolatedMailWorker(mail);
        doThrow(new MailSendException("Synthetic SMTP refusal")).doNothing().when(mail).send(anyString(), anyString(), any());
        var actor = service.register(fields(email(), null), PASSWORD, address);
        worker.deliverNext();
        assertThat(service.current(actor).deliveryStatus()).isEqualTo("PENDING");
        assertThat(mailJob(actor)).containsEntry("status", "RETRY").containsEntry("attempts", 1);
        worker.deliverNext();
        verify(mail, times(1)).send(anyString(), anyString(), any());
        clock.advance(30);
        worker.deliverNext();
        assertThat(mailJob(actor)).containsEntry("status", "SUCCEEDED").containsEntry("attempts", 2);
        assertThat(service.current(actor).deliveryStatus()).isEqualTo("SENT");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.organization_registration WHERE account_id = ?",
                Integer.class, actor.accountId())).isEqualTo(1);
        verify(mail, times(2)).send(anyString(), anyString(), any());
    }

    @Test
    void suppressesSupersededMailAndDeliversOnlyTheLatestProof() throws Exception {
        var mail = mock(RegistrationMailDelivery.class);
        var worker = isolatedMailWorker(mail);
        var actor = service.register(fields(email(), null), PASSWORD, address);
        clock.advance(60);
        service.resend(actor, address);
        worker.deliverNext();
        verifyNoInteractions(mail);
        worker.deliverNext();
        verify(mail).send(anyString(), anyString(), any());
        assertThat(service.current(actor).deliveryStatus()).isEqualTo("SENT");
        assertThat(jdbc.queryForObject("""
                SELECT j.failure_code FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                WHERE e.aggregate_id = ? AND e.source_revision = 1
                """, String.class, actor.accountId())).isEqualTo("SUPERSEDED_OR_EXPIRED");
    }

    @Test
    void neverSendsExpiredOrAlreadyConsumedProofs() {
        var mail = mock(RegistrationMailDelivery.class);
        var worker = isolatedMailWorker(mail);
        var expired = service.register(fields(email(), null), PASSWORD, address);
        clock.advance(600);
        worker.deliverNext();
        assertThat(mailJob(expired)).containsEntry("failure_code", "SUPERSEDED_OR_EXPIRED");
        var consumed = service.register(fields(email(), null), PASSWORD, address);
        service.verifyEmail(consumed, emailCode(consumed), address);
        worker.deliverNext();
        assertThat(mailJob(consumed)).containsEntry("failure_code", "SUPERSEDED_OR_EXPIRED");
        verifyNoInteractions(mail);
    }

    @Test
    void reportsFailureAfterFiveSmtpAttemptsWithoutLosingSavedRegistration() throws Exception {
        var mail = mock(RegistrationMailDelivery.class);
        var worker = isolatedMailWorker(mail);
        doThrow(new MailSendException("Synthetic SMTP outage")).when(mail).send(anyString(), anyString(), any());
        var actor = service.register(fields(email(), null), PASSWORD, address);
        for (int attempt = 1; attempt <= 5; attempt++) {
            worker.deliverNext();
            assertThat(mailJob(actor)).containsEntry("attempts", attempt)
                    .containsEntry("status", attempt == 5 ? "FAILED" : "RETRY");
            if (attempt < 5) clock.advance(15L << attempt);
        }
        assertThat(service.current(actor).deliveryStatus()).isEqualTo("FAILED");
        assertThat(service.current(actor).stage()).isEqualTo("VERIFY_EMAIL");
        verify(mail, times(5)).send(anyString(), anyString(), any());
    }

    @Test
    void crashedFinalAttemptExpiresToFailureInsteadOfRemainingPendingForever() {
        var mail = mock(RegistrationMailDelivery.class);
        var worker = isolatedMailWorker(mail);
        var actor = service.register(fields(email(), null), PASSWORD, address);
        jdbc.update("""
                UPDATE platform.processing_job SET status = 'RUNNING', attempts = 5,
                    lease_owner = 'crashed-test-worker', lease_expires_at = ?
                WHERE event_id IN (SELECT event_id FROM platform.outbox_event WHERE aggregate_id = ?)
                """, Timestamp.from(clock.instant().minusSeconds(1)), actor.accountId());
        worker.deliverNext();
        assertThat(mailJob(actor)).containsEntry("status", "FAILED")
                .containsEntry("failure_code", "DELIVERY_RETRIES_EXHAUSTED").containsEntry("lease_owner", null);
        assertThat(service.current(actor).deliveryStatus()).isEqualTo("FAILED");
        verifyNoInteractions(mail);
    }

    private RegistrationMailWorker isolatedMailWorker(RegistrationMailDelivery mail) {
        // Other tests share this disposable database; postpone their pending jobs, not their registration state.
        jdbc.update("""
                UPDATE platform.processing_job SET next_retry_at = ?
                WHERE handler = 'REGISTRATION_EMAIL' AND status IN ('PENDING', 'RETRY')
                """, Timestamp.from(clock.instant().plusSeconds(86400)));
        return new RegistrationMailWorker(jdbc, store, crypto, mail, clock);
    }

    private java.util.Map<String, Object> mailJob(RegistrationActor actor) {
        return jdbc.queryForMap("""
                SELECT j.status, j.attempts, j.failure_code, j.lease_owner
                FROM platform.processing_job j JOIN platform.outbox_event e USING(event_id)
                WHERE e.aggregate_id = ? ORDER BY e.source_revision DESC LIMIT 1
                """, actor.accountId());
    }

    @SafeVarargs
    private static java.util.List<String> concurrently(Callable<RegistrationActor>... actions) throws Exception {
        var calls = new ArrayList<Callable<String>>();
        for (var action : actions) calls.add(() -> {
            try { return action.call().scope().name(); }
            catch (RegistrationFailure failure) { return failure.code().name(); }
        });
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var outcomes = new ArrayList<String>();
            for (var result : executor.invokeAll(calls)) outcomes.add(result.get());
            return outcomes;
        }
    }

    private String emailCode(RegistrationActor actor) {
        var proof = store.emailProof(actor.accountId()).orElseThrow();
        String ciphertext = jdbc.queryForObject("""
                SELECT payload ->> 'encryptedCode' FROM platform.outbox_event
                WHERE aggregate_id = ? AND event_type = 'REGISTRATION_EMAIL' AND source_revision = ?
                """, String.class, actor.accountId(), proof.generation());
        return crypto.decrypt(ciphertext, "email:" + actor.accountId() + ":" + proof.generation());
    }

    private String enrollmentSecret(RegistrationActor actor, String ciphertext) {
        return crypto.decrypt(ciphertext, "enrollment:" + actor.accountId() + ":" + actor.authVersion() + ":" + actor.issuedAt());
    }

    private String totp(String secret) throws Exception {
        return new TimeBasedOneTimePasswordGenerator().generateOneTimePasswordString(
                new SecretKeySpec(Base64.getDecoder().decode(secret), "HmacSHA1"), clock.instant());
    }

    private static RegistrationFields fields(String email, String slug) {
        return new RegistrationFields("Acme Learning", slug, null, null, "Test Owner", email);
    }

    private static String email() { return UUID.randomUUID() + "@example.test"; }
    private static String key(char character) {
        return Base64.getEncoder().encodeToString(String.valueOf(character).repeat(32).getBytes(StandardCharsets.UTF_8));
    }

    private static void assertFailure(Code code, ThrowingAction action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(RegistrationFailure.class,
                failure -> assertThat(failure.code()).isEqualTo(code));
    }

    @FunctionalInterface
    private interface ThrowingAction { void run() throws Exception; }

    private static final class MutableClock extends Clock {
        private volatile Instant now = Instant.parse("2026-10-21T08:00:00Z");
        void advance(long seconds) { now = now.plusSeconds(seconds); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
