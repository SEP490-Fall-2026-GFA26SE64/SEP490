package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OrganizationRegistrationEntity;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration rows are owned by their account. No unscoped findById/findAll/save is exposed: reads take the account
 * or normalized email, writes are inserts or account-scoped conditional updates.
 */
public interface OrganizationRegistrationJpaRepository
        extends Repository<OrganizationRegistrationEntity, UUID>, InsertOnlyRepository<OrganizationRegistrationEntity> {

    String ROW = "select new com.adaptlearngraph.repository.OrganizationRegistrationJpaRepository$Row("
            + "r.registrationId, r.accountId, r.organizationName, r.workspaceSlug, r.industry, r.headcount, r.adminName,"
            + " a.identifier, a.passwordHash, a.active, r.state, r.emailVerifiedAt, r.completedAt, r.authVersion,"
            + " r.recoveryRequired, r.createdAt, r.updatedAt) from OrganizationRegistrationEntity r join r.account a ";

    /** Fresh (never persistence-context cached) registration joined with its account. */
    record Row(UUID registrationId, UUID accountId, String organizationName, String workspaceSlug, String industry,
               String headcount, String adminName, String identifier, String passwordHash, Boolean active, String state,
               Instant emailVerifiedAt, Instant completedAt, Long authVersion, Boolean recoveryRequired,
               Instant createdAt, Instant updatedAt) {}

    @Query(ROW + "where a.normalizedIdentifier = :email")
    Optional<Row> findRowByEmail(@Param("email") String normalizedEmail);

    @Query(ROW + "where r.accountId = :accountId")
    Optional<Row> findRowByAccountId(@Param("accountId") UUID accountId);

    /** Exact former lock: both the registration and its account row ({@code FOR UPDATE OF r, a}). */
    @Query(value = """
            SELECT r.registration_id FROM platform.organization_registration r
            JOIN platform.account a ON a.account_id = r.account_id
            WHERE r.account_id = :accountId FOR UPDATE OF r, a
            """, nativeQuery = true)
    Optional<UUID> lockByAccountId(@Param("accountId") UUID accountId);

    /** Slug uniqueness is resolved by the database ({@code ON CONFLICT (workspace_slug) DO NOTHING}). */
    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_registration(
                registration_id, account_id, organization_name, workspace_slug, industry, headcount,
                admin_name, created_at, updated_at)
            VALUES (:id, :accountId, :organizationName, :slug, :industry, :headcount, :adminName, :now, :now)
            ON CONFLICT (workspace_slug) DO NOTHING
            """, nativeQuery = true)
    int insertIfSlugFree(@Param("id") UUID id, @Param("accountId") UUID accountId,
            @Param("organizationName") String organizationName, @Param("slug") String slug,
            @Param("industry") String industry, @Param("headcount") String headcount,
            @Param("adminName") String adminName, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationRegistrationEntity r set r.state = 'MFA_PENDING',
                r.emailVerifiedAt = coalesce(r.emailVerifiedAt, :now), r.emailVerificationBypassed = false, r.updatedAt = :now
            where r.accountId = :accountId
            """)
    int markEmailVerified(@Param("accountId") UUID accountId, @Param("now") Instant now);

    /** Changes the verification policy only when it differs (former {@code IS DISTINCT FROM}; columns are NOT NULL). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationRegistrationEntity r set r.state = :state, r.emailVerificationBypassed = :emailBypassed,
                r.mfaBypassed = :mfaBypassed,
                r.completedAt = case when :state = 'REGISTERED' then coalesce(r.completedAt, :now) else r.completedAt end,
                r.updatedAt = :now
            where r.accountId = :accountId
              and (r.state <> :state or r.emailVerificationBypassed <> :emailBypassed or r.mfaBypassed <> :mfaBypassed)
            """)
    int updateVerificationState(@Param("accountId") UUID accountId, @Param("state") String state,
            @Param("emailBypassed") boolean emailBypassed, @Param("mfaBypassed") boolean mfaBypassed,
            @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationRegistrationEntity r set r.state = 'REGISTERED', r.completedAt = coalesce(r.completedAt, :now),
                r.updatedAt = :now, r.recoveryRequired = false, r.mfaBypassed = false, r.authVersion = r.authVersion + 1
            where r.accountId = :accountId
            """)
    int completeEnrollment(@Param("accountId") UUID accountId, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update OrganizationRegistrationEntity r set r.recoveryRequired = true, r.authVersion = r.authVersion + 1,
                r.updatedAt = :now
            where r.accountId = :accountId
            """)
    int beginRecovery(@Param("accountId") UUID accountId, @Param("now") Instant now);

    @Query("select r.authVersion from OrganizationRegistrationEntity r where r.accountId = :accountId")
    Optional<Long> authVersion(@Param("accountId") UUID accountId);
}
