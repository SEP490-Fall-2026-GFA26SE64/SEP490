package com.adaptlearngraph.identity.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.application.port.out.WorkspaceIdentityStore;
import com.adaptlearngraph.identity.application.port.out.WorkspaceIdentityStore.Credential;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.WorkspacePrincipal;
import com.adaptlearngraph.identity.domain.WorkspacePrincipal.Scope;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceAuthenticationServiceTest {
    private final WorkspaceIdentityStore identities = mock(WorkspaceIdentityStore.class);
    private final RegistrationStore security = mock(RegistrationStore.class);
    private final RegistrationSecrets secrets = mock(RegistrationSecrets.class);
    private final RegistrationUseCase registration = mock(RegistrationUseCase.class);
    private final Instant now = Instant.parse("2026-10-22T12:00:00Z");
    private final UUID accountId = UUID.randomUUID();
    private final UUID organizationId = UUID.randomUUID();
    private WorkspaceAuthenticationService service;

    @BeforeEach
    void setup() {
        when(security.transaction(any())).thenAnswer(invocation -> invocation.<Supplier<?>>getArgument(0).get());
        when(secrets.digest(anyString())).thenAnswer(invocation -> invocation.getArgument(0));
        when(secrets.hashPassword(anyString())).thenReturn("dummy-hash");
        when(secrets.passwordMatches("correct-password", "stored-hash")).thenReturn(true);
        when(security.lockRate(anyString(), any())).thenReturn(new RegistrationStore.RateBucket(now, 0, null));
        service = new WorkspaceAuthenticationService(identities, security, secrets, registration,
                Clock.fixed(now, ZoneOffset.UTC));
    }

    private Credential credential(Set<String> roles, long version, boolean totp) {
        return new Credential(accountId, organizationId, "employee@example.test", "Employee", "stored-hash",
                true, true, roles, now.minusSeconds(60), version, false, totp, true);
    }

    private void account(Credential credential) {
        when(identities.findByEmail("employee@example.test")).thenReturn(Optional.of(credential));
        when(identities.lock(accountId)).thenReturn(credential);
    }

    @Test
    void disabledMfaAllowsAdminWithoutFalselyClaimingMfaAndReenableRejectsThatSession() {
        account(credential(Set.of("ORGANIZATION_ADMINISTRATOR"), 0, true));
        var development = new WorkspaceAuthenticationService(identities, security, secrets, registration,
                Clock.fixed(now, ZoneOffset.UTC), new com.adaptlearngraph.shared.domain.IntegrationPolicy(true, true, false));
        var principal = development.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals(Scope.FULL, principal.scope());
        assertFalse(principal.mfaVerified());
        assertEquals("COMPLETE", development.current(principal).stage());
        assertFalse(development.current(principal).mfaVerified());
        assertEquals("SIGN_IN_REQUIRED", service.current(principal).stage());
        verify(security, never()).totp(any());
    }

    @Test
    void disabledEmailVerificationPreservesMissingProofAndReenableRejectsSession() {
        var source = credential(Set.of("EMPLOYEE"), 0, false);
        account(new Credential(source.accountId(), source.organizationId(), source.email(), source.fullName(),
                source.passwordHash(), true, true, source.roles(), null, 0, false, false, true));
        var development = new WorkspaceAuthenticationService(identities, security, secrets, registration,
                Clock.fixed(now, ZoneOffset.UTC), new com.adaptlearngraph.shared.domain.IntegrationPolicy(true, false, true));
        var principal = development.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals("COMPLETE", development.current(principal).stage());
        assertThrows(RegistrationFailure.class, () -> service.current(principal));
        assertThrows(RegistrationFailure.class,
                () -> development.signIn("employee@example.test", "wrong-password", "other-address"));
    }

    @Test
    void employeeGetsPasswordOnlySessionWithoutMfaEnrollment() {
        account(credential(Set.of("EMPLOYEE"), 0, false));
        var principal = service.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals(Scope.FULL, principal.scope());
        assertFalse(principal.mfaVerified());
        assertEquals("COMPLETE", service.current(principal).stage());
        verify(security, never()).totp(any());
    }

    @Test
    void administratorMustPresentTotpBeforeReceivingFullAuthority() {
        account(credential(Set.of("ORGANIZATION_ADMINISTRATOR"), 3, true));
        var principal = service.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals(Scope.PASSWORD, principal.scope());
        assertFalse(principal.mfaVerified());
        assertEquals("CHALLENGE_MFA", service.current(principal).stage());
        when(security.totp(accountId)).thenReturn(Optional.of(new RegistrationStore.TotpCredential("encrypted-fixture", 10)));
        when(secrets.decrypt("encrypted-fixture", "totp:" + accountId)).thenReturn("test-secret");
        when(secrets.matchingTotpStep("test-secret", "123456", now, 10)).thenReturn(11L);
        var completed = service.verifyTotp(principal, "123456", "test-address");
        assertEquals(Scope.FULL, completed.scope());
        assertTrue(completed.mfaVerified());
        verify(security).acceptTotpStep(accountId, 11);
    }

    @Test
    void promotionDoesNotTurnPasswordOnlySessionIntoAdministratorSession() {
        account(credential(Set.of("EMPLOYEE"), 0, false));
        var principal = service.signIn("employee@example.test", "correct-password", "test-address");
        account(credential(Set.of("ORGANIZATION_ADMINISTRATOR"), 0, false));
        var identity = service.current(principal);
        assertEquals("SIGN_IN_REQUIRED", identity.stage());
        assertFalse(identity.mfaVerified());
    }

    @Test
    void revokedAndExactlyExpiredSessionsFail() {
        account(credential(Set.of("EMPLOYEE"), 2, false));
        var old = new WorkspacePrincipal(accountId, Scope.FULL, false, 1, now);
        assertEquals(RegistrationFailure.Code.UNAUTHENTICATED,
                assertThrows(RegistrationFailure.class, () -> service.current(old)).code());
        var expired = new WorkspacePrincipal(accountId, Scope.FULL, false, 2, now.minusSeconds(43_200));
        assertEquals(RegistrationFailure.Code.UNAUTHENTICATED,
                assertThrows(RegistrationFailure.class, () -> service.current(expired)).code());
        var restricted = new WorkspacePrincipal(accountId, Scope.PASSWORD, false, 2, now.minusSeconds(600));
        assertEquals(RegistrationFailure.Code.UNAUTHENTICATED,
                assertThrows(RegistrationFailure.class, () -> service.current(restricted)).code());
    }

    @Test
    void seededPlatformAdministratorNeedsNeitherEmailProofNorMfa() {
        account(new Credential(accountId, null, "employee@example.test", null, "stored-hash",
                true, false, Set.of("PLATFORM_ADMINISTRATOR"), null, 0, false, false, false));
        var principal = service.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals(Scope.FULL, principal.scope());
        assertFalse(principal.mfaVerified());
        assertEquals("COMPLETE", service.current(principal).stage());
        assertEquals(Set.of("PLATFORM_ADMINISTRATOR"), service.current(principal).roles());
        verify(security, never()).totp(any());
        assertThrows(RegistrationFailure.class, () -> service.prepareEnrollment(principal, null));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"EMPLOYEE","DOMAIN_EXPERT","LD_MANAGER"})
    void invitedSingleRoleUsesPasswordOnly(String role) {
        account(credential(Set.of(role), 0, false));
        var principal = service.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals(Scope.FULL, principal.scope());
        assertFalse(principal.mfaVerified());
        assertEquals("COMPLETE", service.current(principal).stage());
    }

    @Test
    void ambiguousRolesCannotAuthenticate() {
        account(credential(Set.of("EMPLOYEE", "DOMAIN_EXPERT"), 0, false));
        assertThrows(RegistrationFailure.class, () -> service.signIn("employee@example.test", "correct-password", "test-address"));
    }

    @Test
    void passwordAloneCannotActivateUnverifiedOrUnreadyIdentity() {
        account(new Credential(accountId, organizationId, "employee@example.test", "Employee", "stored-hash",
                true, true, Set.of("EMPLOYEE"), null, 0, false, false, true));
        assertEquals(RegistrationFailure.Code.UNAUTHENTICATED, assertThrows(RegistrationFailure.class,
                () -> service.signIn("employee@example.test", "correct-password", "test-address")).code());
        account(new Credential(accountId, organizationId, "employee@example.test", "Employee", "stored-hash",
                true, true, Set.of("EMPLOYEE"), now, 0, false, false, false));
        assertEquals(RegistrationFailure.Code.FORBIDDEN, assertThrows(RegistrationFailure.class,
                () -> service.signIn("employee@example.test", "correct-password", "test-address")).code());
    }

    @Test
    void enrollmentIsRestrictedToRequiredAdministratorSetupOrRecovery() {
        account(credential(Set.of("EMPLOYEE"), 0, false));
        var employee = service.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals(RegistrationFailure.Code.FORBIDDEN,
                assertThrows(RegistrationFailure.class, () -> service.prepareEnrollment(employee, null)).code());
        account(credential(Set.of("ORGANIZATION_ADMINISTRATOR"), 0, false));
        var administrator = service.signIn("employee@example.test", "correct-password", "test-address");
        assertEquals(Scope.ENROLLMENT, administrator.scope());
        assertEquals("SETUP_MFA", service.current(administrator).stage());
    }
}
