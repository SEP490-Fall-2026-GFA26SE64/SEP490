package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.EmployeeRoleSelectionEntity;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface KnowledgeJourneyJpaRepository extends Repository<EmployeeRoleSelectionEntity,UUID> {
    @Query(value="""
            SELECT s.selection_id AS id,s.role_id AS roleId,s.job_position_id AS jobPositionId,
                s.role_snapshot::text AS snapshot,s.target_revision AS revision,s.selected_at AS selectedAt,
                (s.ended_at IS NULL) AS current,f.frozen_input::text AS frozenInput
            FROM platform.employee_role_selection s
            LEFT JOIN LATERAL (
                SELECT r.frozen_input FROM platform.initial_pathway_request r
                WHERE r.organization_id=s.organization_id AND r.learner_id=s.learner_id
                    AND r.selection_id=s.selection_id AND r.selection_revision=s.target_revision
                    AND r.flow_version='REQUIREMENT_PATHWAY_V1'
                ORDER BY r.created_at DESC,r.request_id DESC LIMIT 1
            ) f ON true
            WHERE s.organization_id=:org AND s.learner_id=:learner
            ORDER BY s.target_revision DESC,s.selected_at DESC,s.selection_id DESC LIMIT :limit OFFSET :offset
            """,nativeQuery=true)
    List<Row> targets(@Param("org") UUID organization,@Param("learner") UUID learner,@Param("limit") int limit,@Param("offset") int offset);
    interface Row {
        UUID getId();String getRoleId();String getJobPositionId();String getSnapshot();long getRevision();
        Instant getSelectedAt();boolean getCurrent();String getFrozenInput();
    }
}
