package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayApprovalEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Immutable expert approvals of exact revisions (trigger initial_pathway_approval_immutable), scoped by organization and learner. */
public interface InitialPathwayApprovalJpaRepository extends Repository<InitialPathwayApprovalEntity, InitialPathwayApprovalEntity.Key>,
        InsertOnlyRepository<InitialPathwayApprovalEntity> {

    String VALID = """
            from InitialPathwayApprovalEntity a
            join InitialPathwayRevisionEntity v on v.requestId = a.requestId and v.revision = a.revision and v.contentHash = a.contentHash
            """;

    @Query("select count(a) > 0 " + VALID + """
            where v.organizationId = :org and v.learnerId = :learner and a.organizationId = :org
              and a.requestId = :id and a.revision = :revision and a.contentHash = :hash and v.validationStatus = 'VALID'
            """)
    boolean approved(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("revision") long revision, @Param("hash") String contentHash);

    // Native: jsonb path extraction (#>>) of the approved request's frozen binding Role, with LIMIT.
    @Query(value = """
            SELECT a.expert_id,a.assignment_id,a.assignment_version,r.frozen_input #>> ARRAY['input','binding','roleId'] AS role
            FROM platform.initial_pathway_approval a JOIN platform.initial_pathway_revision v
              ON v.request_id=a.request_id AND v.revision=a.revision AND v.content_hash=a.content_hash
            JOIN platform.initial_pathway_request r ON r.request_id=v.request_id AND r.organization_id=v.organization_id AND r.learner_id=v.learner_id
            WHERE a.organization_id=:org AND v.organization_id=:org AND v.learner_id=:learner
              AND a.request_id=:id AND a.revision=:revision AND a.content_hash=:hash AND v.validation_status='VALID' LIMIT 2
            """, nativeQuery = true)
    List<Object[]> approvalWithRole(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("revision") long revision, @Param("hash") String contentHash);

    @Query("select count(a) > 0 " + VALID + """
            join InitialPathwayRequestEntity r on r.requestId = v.requestId and r.organizationId = v.organizationId and r.learnerId = v.learnerId
            where a.organizationId = :org and v.organizationId = :org and v.learnerId = :learner
              and a.requestId = :id and a.revision = :revision and a.contentHash = :hash and v.validationStatus = 'VALID'
              and a.expertId = :expert and a.assignmentId = :assignment and a.assignmentVersion = :version
            """)
    boolean assignedApproval(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("revision") long revision, @Param("hash") String contentHash, @Param("expert") UUID expertId,
            @Param("assignment") String assignmentId, @Param("version") String assignmentVersion);

    // Native: jsonb path (#>>) filter on the approved request's frozen binding Role.
    @Query(value = """
            SELECT EXISTS(SELECT 1 FROM platform.initial_pathway_approval a
              JOIN platform.initial_pathway_revision v ON v.request_id=a.request_id AND v.revision=a.revision AND v.content_hash=a.content_hash
              JOIN platform.initial_pathway_request r ON r.request_id=v.request_id AND r.organization_id=v.organization_id AND r.learner_id=v.learner_id
              WHERE a.organization_id=:org AND v.organization_id=:org AND v.learner_id=:learner
                AND a.request_id=:id AND a.revision=:revision AND a.content_hash=:hash AND v.validation_status='VALID'
                AND a.expert_id=:expert AND a.assignment_id=:assignment AND a.assignment_version=:version
                AND r.frozen_input #>> ARRAY['input','binding','roleId'] IN (:roles))
            """, nativeQuery = true)
    boolean assignedApprovalForRoles(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("revision") long revision, @Param("hash") String contentHash, @Param("expert") UUID expertId,
            @Param("assignment") String assignmentId, @Param("version") String assignmentVersion,
            @Param("roles") Collection<String> roleIds);
}
