package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OrganizationEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Explicit local/development fixture identities: organization, accounts, roles, memberships, profiles, registration,
 * workspace and subscription. Seeds are idempotent, so their writes stay native {@code INSERT ... ON CONFLICT} upserts
 * (with the exact conflict target of each fixture); fixture verification reads are JPQL. Never used by runtime flows.
 */
public interface DevelopmentSeedJpaRepository extends Repository<OrganizationEntity, UUID> {
    record AccountState(UUID organizationId, String identifier, String normalizedIdentifier, String passwordHash, Boolean active) {}

    // ---- organization ----

    // Native: idempotent seed (ON CONFLICT (organization_id) DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.organization(organization_id,code,name) VALUES(:org,:code,:name) ON CONFLICT(organization_id) DO NOTHING",
            nativeQuery = true)
    int insertOrganizationIfAbsent(@Param("org") UUID organizationId, @Param("code") String code, @Param("name") String name);

    // Native: idempotent seed (ON CONFLICT DO NOTHING on any unique key).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.organization(organization_id,code,name) VALUES(:org,:code,:name) ON CONFLICT DO NOTHING",
            nativeQuery = true)
    int insertOrganizationIgnoringConflicts(@Param("org") UUID organizationId, @Param("code") String code, @Param("name") String name);

    // Native: idempotent upsert that re-activates the fixture tenant (ON CONFLICT ... DO UPDATE) with the database clock.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization(organization_id, code, name, status, created_at)
            VALUES (:org, :code, :name, 'ACTIVE', now())
            ON CONFLICT (organization_id) DO UPDATE SET status = 'ACTIVE', name = EXCLUDED.name
            """, nativeQuery = true)
    int upsertActiveOrganization(@Param("org") UUID organizationId, @Param("code") String code, @Param("name") String name);

    @Query("""
            select case when count(o) > 0 then true else false end from OrganizationEntity o
            where o.organizationId = :org and o.code = :code
            """)
    boolean organizationExists(@Param("org") UUID organizationId, @Param("code") String code);

    @Query("""
            select case when count(o) > 0 then true else false end from OrganizationEntity o
            where o.organizationId = :org and o.code = :code and o.status = 'ACTIVE'
            """)
    boolean activeOrganizationExists(@Param("org") UUID organizationId, @Param("code") String code);

    // ---- accounts and platform roles ----

    // Native: idempotent seed (ON CONFLICT (account_id) DO NOTHING); an existing account or password is never overwritten.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
            VALUES(:account,:org,:identifier,:normalized,:hash) ON CONFLICT(account_id) DO NOTHING
            """, nativeQuery = true)
    int insertAccountIfAbsent(@Param("account") UUID accountId, @Param("org") UUID organizationId, @Param("identifier") String identifier,
            @Param("normalized") String normalizedIdentifier, @Param("hash") String passwordHash);

    // Native: idempotent seed (ON CONFLICT DO NOTHING on any unique key, including the normalized identifier).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
            VALUES(:account,:org,:identifier,:normalized,:hash) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertAccountIgnoringConflicts(@Param("account") UUID accountId, @Param("org") UUID organizationId, @Param("identifier") String identifier,
            @Param("normalized") String normalizedIdentifier, @Param("hash") String passwordHash);

    // Native: idempotent upsert that resets the fixture password and re-activates the account (ON CONFLICT ... DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.account(account_id, organization_id, identifier, normalized_identifier, password_hash, active, created_at)
            VALUES (:account, :org, :identifier, :normalized, :hash, true, now())
            ON CONFLICT (account_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = true
            """, nativeQuery = true)
    int upsertActiveAccount(@Param("account") UUID accountId, @Param("org") UUID organizationId, @Param("identifier") String identifier,
            @Param("normalized") String normalizedIdentifier, @Param("hash") String passwordHash);

    @Query("""
            select case when count(a) > 0 then true else false end from AccountEntity a
            where a.accountId = :account and a.organizationId = :org and a.active = true
              and a.identifier = :identifier and a.passwordHash = :hash
            """)
    boolean fixtureAccountExists(@Param("account") UUID accountId, @Param("org") UUID organizationId,
            @Param("identifier") String identifier, @Param("hash") String passwordHash);

    /** The stored fixture account (at most one row); used to refuse silent drift. */
    @Query("""
            select new com.adaptlearngraph.repository.DevelopmentSeedJpaRepository$AccountState(
              a.organizationId, a.identifier, a.normalizedIdentifier, a.passwordHash, a.active)
            from AccountEntity a where a.accountId = :account
            """)
    List<AccountState> accountState(@Param("account") UUID accountId);

    // Native: idempotent seed (ON CONFLICT DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.account_role(account_id,role_code) VALUES(:account,:role) ON CONFLICT DO NOTHING", nativeQuery = true)
    int insertAccountRoleIfAbsent(@Param("account") UUID accountId, @Param("role") String roleCode);

    // Native: idempotent seed (ON CONFLICT DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.learner_state(learner_id) VALUES(:learner) ON CONFLICT DO NOTHING", nativeQuery = true)
    int insertLearnerStateIfAbsent(@Param("learner") UUID learnerId);

    // ---- workspace profile, membership and role ----

    // Native: idempotent seed (ON CONFLICT (account_id) DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at)
            VALUES(:account,:name,:verifiedAt) ON CONFLICT(account_id) DO NOTHING
            """, nativeQuery = true)
    int insertProfileIfAbsent(@Param("account") UUID accountId, @Param("name") String fullName, @Param("verifiedAt") Instant emailVerifiedAt);

    // Native: idempotent seed (ON CONFLICT DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at)
            VALUES(:account,:name,:verifiedAt) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertProfileIgnoringConflicts(@Param("account") UUID accountId, @Param("name") String fullName,
            @Param("verifiedAt") Instant emailVerifiedAt);

    // Native: idempotent upsert of a verified profile with the database clock (ON CONFLICT ... DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.workspace_account_profile(account_id, full_name, email_verified_at, auth_version, recovery_required)
            VALUES (:account, :name, now(), 0, false)
            ON CONFLICT (account_id) DO UPDATE SET full_name = EXCLUDED.full_name, email_verified_at = now()
            """, nativeQuery = true)
    int upsertVerifiedProfile(@Param("account") UUID accountId, @Param("name") String fullName);

    // Native: idempotent seed of a staff membership without department/job-position (ON CONFLICT (account_id) DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,job_position_reference_id,created_at,updated_at)
            VALUES(:membership,:account,:org,true,NULL,NULL,:at,:at) ON CONFLICT(account_id) DO NOTHING
            """, nativeQuery = true)
    int insertStaffMembershipIfAbsent(@Param("membership") UUID membershipId, @Param("account") UUID accountId,
            @Param("org") UUID organizationId, @Param("at") Instant at);

    // Native: idempotent seed of an employee membership (ON CONFLICT (account_id) DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,job_position_reference_id,created_at,updated_at)
            VALUES(:membership,:account,:org,true,:department,:reference,:at,:at) ON CONFLICT(account_id) DO NOTHING
            """, nativeQuery = true)
    int insertEmployeeMembershipIfAbsent(@Param("membership") UUID membershipId, @Param("account") UUID accountId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("reference") UUID jobPositionReferenceId,
            @Param("at") Instant at);

    // Native: idempotent seed of an employee membership (ON CONFLICT DO NOTHING on any unique key).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,department_id,job_position_reference_id,created_at,updated_at)
            VALUES(:membership,:account,:org,true,:department,:reference,:at,:at) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertEmployeeMembershipIgnoringConflicts(@Param("membership") UUID membershipId, @Param("account") UUID accountId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("reference") UUID jobPositionReferenceId,
            @Param("at") Instant at);

    // Native: idempotent upsert re-activating a staff membership and clearing department/job-position (ON CONFLICT ... DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, active, department_id, job_position_reference_id, created_at, updated_at)
            VALUES (:membership, :account, :org, true, NULL, NULL, now(), now())
            ON CONFLICT (account_id) DO UPDATE SET active = true, department_id = EXCLUDED.department_id, job_position_reference_id = EXCLUDED.job_position_reference_id
            """, nativeQuery = true)
    int upsertActiveStaffMembership(@Param("membership") UUID membershipId, @Param("account") UUID accountId,
            @Param("org") UUID organizationId);

    // Native: idempotent upsert re-activating an employee membership (ON CONFLICT ... DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, active, department_id, job_position_reference_id, created_at, updated_at)
            VALUES (:membership, :account, :org, true, :department, :reference, now(), now())
            ON CONFLICT (account_id) DO UPDATE SET active = true, department_id = EXCLUDED.department_id, job_position_reference_id = EXCLUDED.job_position_reference_id
            """, nativeQuery = true)
    int upsertActiveEmployeeMembership(@Param("membership") UUID membershipId, @Param("account") UUID accountId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("reference") UUID jobPositionReferenceId);

    // Native: idempotent seed (ON CONFLICT DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.organization_membership_role(membership_id,role_code) VALUES(:membership,:role) ON CONFLICT DO NOTHING",
            nativeQuery = true)
    int insertMembershipRoleIfAbsent(@Param("membership") UUID membershipId, @Param("role") String roleCode);

    // Native: idempotent upsert replacing the single membership role (ON CONFLICT (membership_id) DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_membership_role(membership_id, role_code)
            VALUES (:membership, :role)
            ON CONFLICT (membership_id) DO UPDATE SET role_code = EXCLUDED.role_code
            """, nativeQuery = true)
    int upsertMembershipRole(@Param("membership") UUID membershipId, @Param("role") String roleCode);

    @Query("""
            select r.roleCode from OrganizationMembershipEntity m, OrganizationMembershipRoleEntity r
            where r.membershipId = m.membershipId and m.membershipId = :membership and m.accountId = :account
              and m.organizationId = :org and m.active = true
            """)
    List<String> activeMembershipRoles(@Param("membership") UUID membershipId, @Param("account") UUID accountId,
            @Param("org") UUID organizationId);

    @Query("""
            select r.roleCode from OrganizationMembershipEntity m, OrganizationMembershipRoleEntity r
            where r.membershipId = m.membershipId and m.membershipId = :membership and m.accountId = :account
              and m.organizationId = :org and m.active = true and m.departmentId = :department and m.jobPositionReferenceId = :reference
            """)
    List<String> activeEmployeeMembershipRoles(@Param("membership") UUID membershipId, @Param("account") UUID accountId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("reference") UUID jobPositionReferenceId);

    @Query("""
            select case when count(a) > 0 then true else false end
            from AccountEntity a, OrganizationMembershipEntity m, OrganizationMembershipRoleEntity g
            where m.accountId = a.accountId and g.membershipId = m.membershipId
              and a.accountId = :account and a.organizationId = :org and m.organizationId = :org
              and a.active = true and m.active = true and g.roleCode = :role
            """)
    boolean activeMemberWithRole(@Param("account") UUID accountId, @Param("org") UUID organizationId, @Param("role") String roleCode);

    // ---- departments and jobPosition references ----

    // Native: idempotent seed (ON CONFLICT (department_id) DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.department_reference(department_id,organization_id,name,active) VALUES(:department,:org,:name,true)
            ON CONFLICT(department_id) DO NOTHING
            """, nativeQuery = true)
    int insertDepartmentIfAbsent(@Param("department") UUID departmentId, @Param("org") UUID organizationId, @Param("name") String name);

    // Native: idempotent seed (ON CONFLICT DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.department_reference(department_id,organization_id,name,active) VALUES(:department,:org,:name,true)
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertDepartmentIgnoringConflicts(@Param("department") UUID departmentId, @Param("org") UUID organizationId,
            @Param("name") String name);

    // Native: idempotent upsert re-activating the department (ON CONFLICT ... DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.department_reference(department_id, organization_id, name, active)
            VALUES (:department, :org, :name, true)
            ON CONFLICT (department_id) DO UPDATE SET active = true
            """, nativeQuery = true)
    int upsertActiveDepartment(@Param("department") UUID departmentId, @Param("org") UUID organizationId, @Param("name") String name);

    // Native: idempotent seed (ON CONFLICT (job_position_reference_id) DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.job_position_department_reference(job_position_reference_id,job_position_id,organization_id,department_id,name,active)
            VALUES(:reference,:jobPosition,:org,:department,:name,true) ON CONFLICT(job_position_reference_id) DO NOTHING
            """, nativeQuery = true)
    int insertJobPositionReferenceIfAbsent(@Param("reference") UUID jobPositionReferenceId, @Param("jobPosition") UUID jobPositionId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("name") String name);

    // Native: idempotent seed (ON CONFLICT DO NOTHING on any unique key).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.job_position_department_reference(job_position_reference_id,job_position_id,organization_id,department_id,name,active)
            VALUES(:reference,:jobPosition,:org,:department,:name,true) ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertJobPositionReferenceIgnoringConflicts(@Param("reference") UUID jobPositionReferenceId, @Param("jobPosition") UUID jobPositionId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("name") String name);

    // Native: idempotent upsert re-activating the jobPosition reference (ON CONFLICT ... DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.job_position_department_reference(job_position_reference_id, job_position_id, organization_id, department_id, name, active)
            VALUES (:reference, :jobPosition, :org, :department, :name, true)
            ON CONFLICT (job_position_reference_id) DO UPDATE SET active = true
            """, nativeQuery = true)
    int upsertActiveJobPositionReference(@Param("reference") UUID jobPositionReferenceId, @Param("jobPosition") UUID jobPositionId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("name") String name);

    @Query("""
            select case when count(r) > 0 then true else false end
            from JobPositionDepartmentReferenceEntity r, DepartmentReferenceEntity d
            where d.departmentId = r.departmentId and d.organizationId = r.organizationId
              and r.jobPositionReferenceId = :reference and r.jobPositionId = :jobPosition and r.organizationId = :org
              and r.departmentId = :department and r.name = :name and r.active = true and d.name = :departmentName and d.active = true
            """)
    boolean activeJobPositionReference(@Param("reference") UUID jobPositionReferenceId, @Param("jobPosition") UUID jobPositionId,
            @Param("org") UUID organizationId, @Param("department") UUID departmentId, @Param("name") String name,
            @Param("departmentName") String departmentName);

    // ---- registration and workspace ----

    // Native: idempotent seed (ON CONFLICT (registration_id) DO NOTHING) with explicit fixture timestamps.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_registration(registration_id,account_id,organization_name,workspace_slug,
              admin_name,state,email_verified_at,completed_at,created_at,updated_at)
            VALUES(:registration,:account,:organizationName,:slug,:adminName,'REGISTERED',:at,:at,:at,:at)
            ON CONFLICT(registration_id) DO NOTHING
            """, nativeQuery = true)
    int insertRegistrationIfAbsent(@Param("registration") UUID registrationId, @Param("account") UUID accountId,
            @Param("organizationName") String organizationName, @Param("slug") String workspaceSlug,
            @Param("adminName") String adminName, @Param("at") Instant at);

    // Native: idempotent seed (ON CONFLICT (registration_id) DO NOTHING) with the database clock.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_registration(
                registration_id, account_id, organization_name, workspace_slug,
                admin_name, state, email_verified_at, completed_at, created_at, updated_at
            ) VALUES (
                :registration, :account, :organizationName, :slug,
                :adminName, 'REGISTERED', now(), now(), now(), now()
            ) ON CONFLICT (registration_id) DO NOTHING
            """, nativeQuery = true)
    int insertRegistrationNowIfAbsent(@Param("registration") UUID registrationId, @Param("account") UUID accountId,
            @Param("organizationName") String organizationName, @Param("slug") String workspaceSlug,
            @Param("adminName") String adminName);

    // Native: idempotent seed (ON CONFLICT (organization_id) DO NOTHING) with explicit fixture timestamps.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at,ready_at)
            VALUES(:workspace,:org,:registration,:slug,'READY',:at,:at) ON CONFLICT(organization_id) DO NOTHING
            """, nativeQuery = true)
    int insertReadyWorkspaceIfAbsent(@Param("workspace") UUID workspaceId, @Param("org") UUID organizationId,
            @Param("registration") UUID registrationId, @Param("slug") String slug, @Param("at") Instant at);

    // Native: idempotent upsert marking the workspace READY with the database clock (ON CONFLICT ... DO UPDATE).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.organization_workspace(
                workspace_id, organization_id, registration_id, slug, setup_state, created_at, ready_at
            ) VALUES (
                :workspace, :org, :registration, :slug, 'READY', now(), now()
            ) ON CONFLICT (organization_id) DO UPDATE SET setup_state = 'READY', ready_at = coalesce(EXCLUDED.ready_at, now())
            """, nativeQuery = true)
    int upsertReadyWorkspace(@Param("workspace") UUID workspaceId, @Param("org") UUID organizationId,
            @Param("registration") UUID registrationId, @Param("slug") String slug);

    // ---- subscription bootstrap ----

    // Native: idempotent seed (ON CONFLICT (intent_id) DO NOTHING) with the database clock.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.subscription_intent(
                intent_id, kind, state, registration_id, owner_account_id, applied_order_id, created_at, updated_at
            ) VALUES (
                :intent, 'PURCHASE', 'OPEN', :registration, :owner, NULL, now(), now()
            ) ON CONFLICT (intent_id) DO NOTHING
            """, nativeQuery = true)
    int insertPurchaseIntentIfAbsent(@Param("intent") UUID intentId, @Param("registration") UUID registrationId,
            @Param("owner") UUID ownerAccountId);

    // Native: idempotent seed (ON CONFLICT (order_id) DO NOTHING) of the paid bootstrap order; interval arithmetic on now().
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.payment_order(
                order_id, intent_id, created_by, attempt, plan_id, plan_version_id,
                name, description, price_vnd, currency, duration_months, employee_seats,
                idempotency_key, request_digest, payment_status, observed_paid_amount, paid_at,
                created_at, expires_at
            ) VALUES (
                :order, :intent, :createdBy, 1, :plan, :planVersion,
                'Enterprise Plan', 'Enterprise Plan Bootstrap', 24500000, 'VND', 12, 200,
                :idempotencyKey, '0000000000000000000000000000000000000000000000000000000000000000', 'PAID', 24500000, now(),
                now(), now() + interval '30 minutes'
            ) ON CONFLICT (order_id) DO NOTHING
            """, nativeQuery = true)
    int insertPaidBootstrapOrderIfAbsent(@Param("order") UUID orderId, @Param("intent") UUID intentId, @Param("createdBy") UUID createdBy,
            @Param("plan") UUID planId, @Param("planVersion") UUID planVersionId, @Param("idempotencyKey") UUID idempotencyKey);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update SubscriptionIntentEntity i set i.state = 'APPLIED', i.appliedOrderId = :order where i.intentId = :intent")
    int applyIntent(@Param("intent") UUID intentId, @Param("order") UUID orderId);

    // Native: idempotent seed (ON CONFLICT (organization_id) DO NOTHING) with the database clock.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.subscription(subscription_id, organization_id, created_at)
            VALUES (:subscription, :org, now())
            ON CONFLICT (organization_id) DO NOTHING
            """, nativeQuery = true)
    int insertSubscriptionIfAbsent(@Param("subscription") UUID subscriptionId, @Param("org") UUID organizationId);

    @Query("select count(p) from SubscriptionPeriodEntity p where p.subscriptionId = :subscription")
    long periodCount(@Param("subscription") UUID subscriptionId);

    // Native: idempotent seed (ON CONFLICT (period_id) DO NOTHING) with the database clock for created_at.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.subscription_period(
                period_id, subscription_id, order_id, starts_at, ends_at, billing_zone, anniversary_day, created_at
            ) VALUES (
                :period, :subscription, :order, :startsAt, :endsAt, 'Asia/Ho_Chi_Minh', 1, now()
            ) ON CONFLICT (period_id) DO NOTHING
            """, nativeQuery = true)
    int insertPeriodIfAbsent(@Param("period") UUID periodId, @Param("subscription") UUID subscriptionId, @Param("order") UUID orderId,
            @Param("startsAt") Instant startsAt, @Param("endsAt") Instant endsAt);
}
