package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.DepartmentReferenceEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Organization reference data; every query is scoped by organization. */
public interface DepartmentReferenceJpaRepository extends Repository<DepartmentReferenceEntity, UUID> {
    record Choice(UUID departmentId, String departmentName, UUID occupationReferenceId, String occupationName) {}

    @Query("""
            select count(d) > 0 from DepartmentReferenceEntity d
            where d.departmentId = :department and d.organizationId = :organization and (d.active = true or :historical = true)
            """)
    boolean departmentUsable(@Param("organization") UUID organization, @Param("department") UUID department,
            @Param("historical") boolean preserveHistoricalReferences);

    @Query("""
            select count(o) > 0 from OccupationDepartmentReferenceEntity o
            where o.occupationReferenceId = :occupation and o.departmentId = :department and o.organizationId = :organization
              and (o.active = true or :historical = true)
            """)
    boolean occupationUsable(@Param("organization") UUID organization, @Param("department") UUID department,
            @Param("occupation") UUID occupation, @Param("historical") boolean preserveHistoricalReferences);

    @Query("""
            select new com.adaptlearngraph.repository.DepartmentReferenceJpaRepository$Choice(d.departmentId, d.name,
                o.occupationReferenceId, o.name)
            from DepartmentReferenceEntity d
            join OccupationDepartmentReferenceEntity o on o.departmentId = d.departmentId and o.organizationId = d.organizationId
            where d.organizationId = :organization and d.active = true and o.active = true
            order by d.name, o.name
            """)
    List<Choice> activeChoices(@Param("organization") UUID organization);
}
