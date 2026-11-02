package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AccountEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Accounts are created by insert only; credentials are read only through scoped projections. */
public interface AccountJpaRepository extends Repository<AccountEntity, UUID>, InsertOnlyRepository<AccountEntity> {
    String IDENTITY = """
            select new com.adaptlearngraph.repository.AccountJpaRepository$Identity(a.accountId, a.organizationId, a.identifier,
                a.passwordHash, a.active, coalesce(p.fullName, r.adminName), coalesce(r.emailVerifiedAt, p.emailVerifiedAt),
                coalesce(r.authVersion, p.authVersion, 0L), coalesce(r.recoveryRequired, p.recoveryRequired, false),
                coalesce(m.active, false), case when w.setupState = 'READY' then true else false end, w.slug,
                case when exists (select 1 from AccountTotpEntity t where t.accountId = a.accountId) then true else false end)
            from AccountEntity a
            left join OrganizationRegistrationEntity r on r.accountId = a.accountId
            left join WorkspaceAccountProfileEntity p on p.accountId = a.accountId
            left join OrganizationMembershipEntity m on m.accountId = a.accountId and m.organizationId = a.organizationId
            left join OrganizationWorkspaceEntity w on w.organizationId = m.organizationId
            """;

    /** Sign-in view of one account across registration, member profile, membership and workspace. */
    record Identity(UUID accountId, UUID organizationId, String identifier, String passwordHash, Boolean active,
                    String fullName, Instant emailVerifiedAt, Long authVersion, Boolean recoveryRequired,
                    Boolean membershipActive, Boolean workspaceReady, String workspaceSlug, Boolean hasTotp) {
        @Override public String toString() { return "AccountIdentity[redacted]"; }
    }

    /** Platform-operator bootstrap view; never exposed outside the bootstrap. */
    record Seed(UUID accountId, String passwordHash, Boolean active, UUID organizationId, Boolean platformAdministrator,
                Boolean registered) {
        @Override public String toString() { return "SeedIdentity[redacted]"; }
    }

    boolean existsByNormalizedIdentifier(String normalizedIdentifier);

    @Query(IDENTITY + "where a.normalizedIdentifier = :email")
    Optional<Identity> findIdentityByEmail(@Param("email") String normalizedEmail);

    @Query(IDENTITY + "where a.accountId = :accountId")
    Optional<Identity> findIdentityById(@Param("accountId") UUID accountId);

    @Query(value = "SELECT account_id FROM platform.account WHERE account_id = :accountId FOR UPDATE", nativeQuery = true)
    Optional<UUID> lock(@Param("accountId") UUID accountId);

    @Query(value = "SELECT account_id FROM platform.account WHERE normalized_identifier = :email FOR UPDATE",
            nativeQuery = true)
    Optional<UUID> lockByEmail(@Param("email") String normalizedEmail);

    @Query("""
            select new com.adaptlearngraph.repository.AccountJpaRepository$Seed(a.accountId, a.passwordHash, a.active,
                a.organizationId,
                case when exists (select 1 from PlatformAdministratorEntity p where p.accountId = a.accountId) then true else false end,
                case when exists (select 1 from OrganizationRegistrationEntity r where r.accountId = a.accountId) then true else false end)
            from AccountEntity a where a.accountId = :accountId
            """)
    Optional<Seed> findSeed(@Param("accountId") UUID accountId);
}
