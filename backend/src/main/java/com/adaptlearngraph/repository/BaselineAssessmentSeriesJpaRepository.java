package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineAssessmentSeriesEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization + Occupation baseline lifecycle coordination rows and their scoped read models. Every mutation locks the
 * series row first; pointer changes are revision compare-and-set updates returning their exact row count.
 */
public interface BaselineAssessmentSeriesJpaRepository
        extends Repository<BaselineAssessmentSeriesEntity, BaselineAssessmentSeriesEntity.Key>,
        InsertOnlyRepository<BaselineAssessmentSeriesEntity> {

    record ScopeRow(UUID organizationId, String occupationId) {}

    record BlueprintVersionRow(UUID blueprintId, Integer version, String name, Instant createdAt) {}

    record AssessmentVersionRow(UUID assessmentVersionId, Integer version, Integer blueprintVersion, String publicationState,
                                String candidateState, String contentHash, Instant createdAt, Boolean disabled) {}

    record SnapshotRow(UUID organizationId, String occupationId, UUID blueprintId, Long seriesRevision, UUID workingRevisionId,
                       Integer pendingBlueprintVersion, UUID candidateId, Integer candidateVersion,
                       Integer candidateBlueprintVersion, Long candidateDraftRevision, String candidateContentHash,
                       String candidateReviewedContentHash, UUID activeId, Integer activeVersion,
                       Integer activeBlueprintVersion) {}

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAssessmentSeriesJpaRepository$SnapshotRow(series.organizationId,
                series.occupationId, series.blueprintId, series.seriesRevision, series.workingRevisionId,
                series.pendingBlueprintVersion, candidate.assessmentVersionId, candidate.version, candidate.blueprintVersion,
                candidate.draftRevision, candidate.contentHash, candidate.reviewedContentHash,
                active.assessmentVersionId, active.version, active.blueprintVersion)
            from BaselineAssessmentSeriesEntity series
            left join AssessmentVersionEntity candidate on candidate.assessmentVersionId = series.openAssessmentVersionId
            left join AssessmentVersionEntity active on active.assessmentVersionId = series.activeAssessmentVersionId
            where series.organizationId = :org and series.occupationId = :occupation
            """)
    List<SnapshotRow> snapshot(@Param("org") UUID organizationId, @Param("occupation") String occupationId);

    // Native: row lock (FOR UPDATE) on the scope's series row only (the former FOR UPDATE OF series).
    @Query(value = """
            SELECT series.blueprint_id
            FROM platform.baseline_assessment_series series
            WHERE series.organization_id = :org AND series.occupation_id = :occupation
            FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lock(@Param("org") UUID organizationId, @Param("occupation") String occupationId);

    /**
     * Locks the series of a Blueprint for assessment generation, scoped to the generating actor's organization (the
     * draft port carries no organization id; the actor's account row supplies it).
     */
    // Native: row lock (FOR UPDATE OF series) joined to the identity and actor account rows.
    @Query(value = """
            SELECT series.series_revision
            FROM platform.baseline_assessment_series series
            JOIN platform.baseline_blueprint identity
              ON identity.blueprint_id = series.blueprint_id
            JOIN platform.account actor
              ON actor.account_id = :createdBy
             AND actor.organization_id = series.organization_id
            WHERE series.blueprint_id = :blueprintId
              AND identity.organization_id = series.organization_id
            FOR UPDATE OF series
            """, nativeQuery = true)
    List<Long> lockForGeneration(@Param("blueprintId") UUID blueprintId, @Param("createdBy") UUID createdBy);

    // Native: idempotent series creation (INSERT ... SELECT ... ON CONFLICT (organization_id, occupation_id) DO NOTHING).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.baseline_assessment_series (
                organization_id, occupation_id, blueprint_id)
            SELECT identity.organization_id, identity.occupation_id, identity.blueprint_id
            FROM platform.baseline_blueprint identity
            WHERE identity.blueprint_id = :blueprintId
              AND identity.organization_id = :org
              AND identity.occupation_id = CAST(:occupation AS text)
            ON CONFLICT (organization_id, occupation_id) DO NOTHING
            """, nativeQuery = true)
    int ensure(@Param("org") UUID organizationId, @Param("occupation") String occupationId,
            @Param("blueprintId") UUID blueprintId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update BaselineAssessmentSeriesEntity series
            set series.seriesRevision = :nextRevision, series.workingRevisionId = :workingRevisionId,
                series.pendingBlueprintVersion = :pendingBlueprintVersion,
                series.openAssessmentVersionId = :openAssessmentVersionId,
                series.activeAssessmentVersionId = :activeAssessmentVersionId, series.updatedAt = :occurredAt
            where series.organizationId = :org and series.occupationId = :occupation
              and series.seriesRevision = :expectedRevision
            """)
    int compareAndSet(@Param("org") UUID organizationId, @Param("occupation") String occupationId,
            @Param("expectedRevision") long expectedRevision, @Param("nextRevision") long nextRevision,
            @Param("workingRevisionId") UUID workingRevisionId, @Param("pendingBlueprintVersion") Integer pendingBlueprintVersion,
            @Param("openAssessmentVersionId") UUID openAssessmentVersionId,
            @Param("activeAssessmentVersionId") UUID activeAssessmentVersionId, @Param("occurredAt") Instant occurredAt);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAssessmentSeriesJpaRepository$ScopeRow(series.organizationId,
                series.occupationId)
            from AssessmentVersionEntity assessment
            join BaselineAssessmentSeriesEntity series on series.blueprintId = assessment.blueprintId
            where series.organizationId = :org and assessment.assessmentVersionId = :assessmentVersionId
              and assessment.purpose = 'BASELINE'
            """)
    List<ScopeRow> scopeByAssessment(@Param("org") UUID organizationId, @Param("assessmentVersionId") UUID assessmentVersionId);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAssessmentSeriesJpaRepository$BlueprintVersionRow(version.blueprintId,
                version.version, version.name, version.createdAt)
            from BaselineBlueprintVersionEntity version
            join BaselineAssessmentSeriesEntity series on series.blueprintId = version.blueprintId
            where series.organizationId = :org and series.occupationId = :occupation
            order by version.version desc
            """)
    List<BlueprintVersionRow> blueprintVersions(@Param("org") UUID organizationId, @Param("occupation") String occupationId);

    @Query("""
            select new com.adaptlearngraph.repository.BaselineAssessmentSeriesJpaRepository$AssessmentVersionRow(
                assessment.assessmentVersionId, assessment.version, assessment.blueprintVersion, assessment.publicationState,
                assessment.baselineCandidateState, assessment.contentHash, assessment.createdAt,
                case when exists (
                    select 1 from BaselineAssessmentTransitionEntity transition
                    where transition.organizationId = :org and transition.occupationId = :occupation
                      and transition.transition = 'ACTIVE_ASSESSMENT_DISABLED'
                      and transition.previousActiveAssessmentVersionId = assessment.assessmentVersionId
                ) then true else false end)
            from AssessmentVersionEntity assessment
            join BaselineAssessmentSeriesEntity series on series.blueprintId = assessment.blueprintId
            where series.organizationId = :org and series.occupationId = :occupation and assessment.purpose = 'BASELINE'
            order by assessment.version desc
            """)
    List<AssessmentVersionRow> assessmentVersions(@Param("org") UUID organizationId, @Param("occupation") String occupationId);
}
