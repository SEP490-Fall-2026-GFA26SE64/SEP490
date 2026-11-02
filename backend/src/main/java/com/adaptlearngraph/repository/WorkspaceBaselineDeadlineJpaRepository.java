package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.BaselineAdaptiveAttemptEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/**
 * System deadline scheduler input. This is the only cross-organization read: it lists the organizations that have an
 * in-progress attempt so each one is then finalized through its own organization-scoped worker.
 */
public interface WorkspaceBaselineDeadlineJpaRepository extends Repository<BaselineAdaptiveAttemptEntity, UUID> {
    @Query("select distinct a.organizationId from BaselineAdaptiveAttemptEntity a where a.state = 'IN_PROGRESS'")
    List<UUID> organizationsWithAttemptsInProgress();
}
