package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.EmployeeRoleSelectionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Current string-ID role selections, scoped by organization and learner. */
public interface EmployeeRoleSelectionJpaRepository
        extends Repository<EmployeeRoleSelectionEntity, UUID>, InsertOnlyRepository<EmployeeRoleSelectionEntity> {

    record Row(UUID selectionId, String roleId, String occupationId, String roleSnapshot, Long targetRevision, Instant selectedAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.EmployeeRoleSelectionJpaRepository$Row(s.selectionId, s.roleId, s.occupationId,
                s.roleSnapshot, s.targetRevision, s.selectedAt)
            from EmployeeRoleSelectionEntity s
            where s.organizationId = :org and s.learnerId = :learner and s.endedAt is null
            """)
    List<Row> current(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update EmployeeRoleSelectionEntity s set s.endedAt = :time
            where s.organizationId = :org and s.learnerId = :learner and s.endedAt is null
            """)
    int endCurrent(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("time") Instant endedAt);

    @Query("""
            select count(a) > 0 from BaselineAdaptiveAttemptEntity a
            where a.organizationId = :org and a.learnerId = :learner and a.state = 'IN_PROGRESS'
            """)
    boolean assessmentInProgress(@Param("org") UUID organizationId, @Param("learner") UUID learnerId);
}
