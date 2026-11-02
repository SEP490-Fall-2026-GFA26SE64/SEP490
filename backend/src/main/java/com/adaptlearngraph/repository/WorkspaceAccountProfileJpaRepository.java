package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.WorkspaceAccountProfileEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Member security profile. Registered owners are excluded: their auth state lives on the registration row. */
public interface WorkspaceAccountProfileJpaRepository
        extends Repository<WorkspaceAccountProfileEntity, UUID>, InsertOnlyRepository<WorkspaceAccountProfileEntity> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceAccountProfileEntity p set p.authVersion = p.authVersion + 1, p.recoveryRequired = false
            where p.accountId = :accountId
              and not exists (select 1 from OrganizationRegistrationEntity r where r.accountId = :accountId)
            """)
    int completeEnrollment(@Param("accountId") UUID accountId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update WorkspaceAccountProfileEntity p set p.authVersion = p.authVersion + 1, p.recoveryRequired = true
            where p.accountId = :accountId
            """)
    int beginRecovery(@Param("accountId") UUID accountId);

    @Query("select p.authVersion from WorkspaceAccountProfileEntity p where p.accountId = :accountId")
    Optional<Long> authVersion(@Param("accountId") UUID accountId);

    /** Creates or renames the member profile, carrying verified security state over from the registration. */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional(com.adaptlearngraph.constants.TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.workspace_account_profile(account_id, full_name, email_verified_at, auth_version, recovery_required)
            SELECT a.account_id, :fullName, coalesce(p.email_verified_at, r.email_verified_at),
              coalesce(p.auth_version, r.auth_version, 0), coalesce(p.recovery_required, r.recovery_required, false)
            FROM platform.account a LEFT JOIN platform.workspace_account_profile p USING(account_id)
            LEFT JOIN platform.organization_registration r USING(account_id)
            WHERE a.account_id = :account AND coalesce(p.email_verified_at, r.email_verified_at) IS NOT NULL
            ON CONFLICT(account_id) DO UPDATE SET full_name = excluded.full_name
            """, nativeQuery = true)
    int upsertFullName(@Param("account") UUID accountId, @Param("fullName") String fullName);}
