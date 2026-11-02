package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.RegistrationFailure;
import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;

/** JPA adapter for {@link WorkspaceIdentityStore} (sign-in identity of registered owners and invited members). */
public final class JpaWorkspaceIdentityStore implements WorkspaceIdentityStore {
    private final AccountJpaRepository accounts;
    private final OrganizationMembershipRoleJpaRepository roles;
    private final PlatformAdministratorJpaRepository platformAdministrators;
    private final OrganizationRegistrationJpaRepository registrations;
    private final WorkspaceAccountProfileJpaRepository profiles;
    private final RegistrationStore registration;

    public JpaWorkspaceIdentityStore(AccountJpaRepository accounts, OrganizationMembershipRoleJpaRepository roles,
            PlatformAdministratorJpaRepository platformAdministrators, OrganizationRegistrationJpaRepository registrations,
            WorkspaceAccountProfileJpaRepository profiles, RegistrationStore registration) {
        this.accounts = accounts;
        this.roles = roles;
        this.platformAdministrators = platformAdministrators;
        this.registrations = registrations;
        this.profiles = profiles;
        this.registration = registration;
    }

    @Override
    public Optional<Credential> findByEmail(String email) {
        return accounts.findIdentityByEmail(email).map(this::credential);
    }

    @Override
    public Credential lock(UUID accountId) {
        if (registered(accountId)) registration.lockRegistration(accountId);
        else accounts.lock(accountId);
        return accounts.findIdentityById(accountId).map(this::credential)
                .orElseThrow(() -> new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED,
                        "Your account is unavailable. Sign in again."));
    }

    @Override
    public void completeEnrollment(UUID accountId, String encryptedSecret, long step, Instant now) {
        registration.completeEnrollment(accountId, encryptedSecret, step, now);
        profiles.completeEnrollment(accountId);
    }

    @Override
    public long beginRecovery(UUID accountId, Instant now) {
        if (registered(accountId)) return registration.beginRecovery(accountId, now);
        if (profiles.beginRecovery(accountId) == 0) throw new EmptyResultDataAccessException(1);
        return profiles.authVersion(accountId).orElseThrow(() -> new EmptyResultDataAccessException(1));
    }

    private boolean registered(UUID accountId) {
        return registrations.authVersion(accountId).isPresent();
    }

    private Credential credential(AccountJpaRepository.Identity row) {
        var granted = new HashSet<>(roles.roleCodesOfAccount(row.accountId()));
        if (platformAdministrators.existsByAccountId(row.accountId())) granted.add("PLATFORM_ADMINISTRATOR");
        return new Credential(row.accountId(), row.organizationId(), row.identifier(), row.fullName(), row.passwordHash(),
                Boolean.TRUE.equals(row.active()), Boolean.TRUE.equals(row.membershipActive()), granted, row.emailVerifiedAt(),
                row.authVersion() == null ? 0 : row.authVersion(), Boolean.TRUE.equals(row.recoveryRequired()),
                Boolean.TRUE.equals(row.hasTotp()), Boolean.TRUE.equals(row.workspaceReady()), row.workspaceSlug());
    }
}
