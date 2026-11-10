package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.DepartmentReferenceEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import com.adaptlearngraph.constants.TransactionManagers;

import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Organization reference data; every query is scoped by organization. */
public interface DepartmentReferenceJpaRepository extends Repository<DepartmentReferenceEntity, UUID> {
    record Choice(UUID departmentId, String departmentName, UUID jobPositionReferenceId, String jobPositionName) {}

    @Query("""
            select count(d) > 0 from DepartmentReferenceEntity d
            where d.departmentId = :department and d.organizationId = :organization and (d.active = true or :historical = true)
            """)
    boolean departmentUsable(@Param("organization") UUID organization, @Param("department") UUID department,
            @Param("historical") boolean preserveHistoricalReferences);

    @Query("select d.organizationId from DepartmentReferenceEntity d where d.departmentId = :department")
    List<UUID> findDepartmentOwnerOrganizationIds(@Param("department") UUID department);

    @Query("""
            select count(o) > 0 from JobPositionDepartmentReferenceEntity o
            where o.jobPositionReferenceId = :jobPosition and o.departmentId = :department and o.organizationId = :organization
              and (o.active = true or :historical = true)
            """)
    boolean jobPositionUsable(@Param("organization") UUID organization, @Param("department") UUID department,
            @Param("jobPosition") UUID jobPosition, @Param("historical") boolean preserveHistoricalReferences);

    @Query("select o.organizationId from JobPositionDepartmentReferenceEntity o where o.jobPositionReferenceId = :jobPosition")
    List<UUID> findJobPositionOwnerOrganizationIds(@Param("jobPosition") UUID jobPosition);

    @Query("""
            select new com.adaptlearngraph.repository.DepartmentReferenceJpaRepository$Choice(d.departmentId, d.name,
                o.jobPositionReferenceId, o.name)
            from DepartmentReferenceEntity d
            join JobPositionDepartmentReferenceEntity o on o.departmentId = d.departmentId and o.organizationId = d.organizationId
            where d.organizationId = :organization and d.active = true and o.active = true
            order by d.name, o.name
            """)
    List<Choice> activeChoices(@Param("organization") UUID organization);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.department_reference(department_id, organization_id, name, active)
            VALUES (:departmentId, :organizationId, :name, true)
            ON CONFLICT (department_id) DO UPDATE SET name = :name, active = true
            """, nativeQuery = true)
    int upsertDepartmentReference(@Param("departmentId") UUID departmentId,
                                  @Param("organizationId") UUID organizationId,
                                  @Param("name") String name);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.job_position_department_reference(job_position_reference_id, job_position_id, organization_id, department_id, name, active)
            VALUES (:jobPositionReferenceId, :jobPositionId, :organizationId, :departmentId, :name, true)
            ON CONFLICT (job_position_reference_id) DO UPDATE SET name = :name, active = true
            """, nativeQuery = true)
    int upsertJobPositionReference(@Param("jobPositionReferenceId") UUID jobPositionReferenceId,
                                   @Param("jobPositionId") UUID jobPositionId,
                                   @Param("organizationId") UUID organizationId,
                                   @Param("departmentId") UUID departmentId,
                                   @Param("name") String name);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.organization_membership
            SET department_id = NULL, job_position_reference_id = NULL, updated_at = NOW(), revision = revision + 1
            WHERE organization_id = :organizationId AND department_id = :departmentId
            """, nativeQuery = true)
    int clearMembershipDepartment(@Param("organizationId") UUID organizationId, @Param("departmentId") UUID departmentId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.workspace_activation
            SET department_id = NULL, job_position_reference_id = NULL
            WHERE organization_id = :organizationId AND department_id = :departmentId
            """, nativeQuery = true)
    int clearWorkspaceActivationDepartment(@Param("organizationId") UUID organizationId, @Param("departmentId") UUID departmentId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.workspace_baseline_resource
            SET job_position_reference_id = NULL
            WHERE organization_id = :organizationId
              AND job_position_reference_id IN (
                SELECT job_position_reference_id FROM platform.job_position_department_reference
                WHERE organization_id = :organizationId AND department_id = :departmentId
              )
            """, nativeQuery = true)
    int clearWorkspaceBaselineResourceDepartment(@Param("organizationId") UUID organizationId, @Param("departmentId") UUID departmentId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            DELETE FROM platform.job_position_department_reference
            WHERE organization_id = :organizationId AND department_id = :departmentId
            """, nativeQuery = true)
    int deleteJobPositionReferences(@Param("organizationId") UUID organizationId, @Param("departmentId") UUID departmentId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            DELETE FROM platform.department_reference
            WHERE organization_id = :organizationId AND department_id = :departmentId
            """, nativeQuery = true)
    int deleteDepartmentReference(@Param("organizationId") UUID organizationId, @Param("departmentId") UUID departmentId);

    @Query(value = """
            SELECT department_id FROM platform.department_reference
            WHERE organization_id = :organizationId
              AND ((CAST(:deptId AS uuid) IS NOT NULL AND department_id = CAST(:deptId AS uuid))
                   OR (:deptName IS NOT NULL AND :deptName <> '' AND LOWER(name) = LOWER(:deptName)))
            """, nativeQuery = true)
    List<UUID> findMatchingDepartmentIds(@Param("organizationId") UUID organizationId,
                                         @Param("deptId") UUID deptId,
                                         @Param("deptName") String deptName);
}
