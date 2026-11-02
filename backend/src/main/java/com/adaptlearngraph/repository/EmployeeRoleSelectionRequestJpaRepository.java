package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.EmployeeRoleSelectionRequestEntity;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Append-only role-selection command replies (trigger employee_role_request_immutable). */
public interface EmployeeRoleSelectionRequestJpaRepository extends Repository<EmployeeRoleSelectionRequestEntity, EmployeeRoleSelectionRequestEntity.Key>,
        InsertOnlyRepository<EmployeeRoleSelectionRequestEntity> {

    record Row(String requestHash, String response) {}

    @Query("""
            select new com.adaptlearngraph.repository.EmployeeRoleSelectionRequestJpaRepository$Row(r.requestHash, r.response)
            from EmployeeRoleSelectionRequestEntity r
            where r.organizationId = :org and r.learnerId = :learner and r.retryKey = :retry
            """)
    List<Row> find(@Param("org") java.util.UUID organizationId, @Param("learner") java.util.UUID learnerId, @Param("retry") String retryKey);
}
