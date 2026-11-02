package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.AssessmentVersionEntity;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generated assessment versions. Reads and transitions are scoped by the owning organization's Blueprint identity or
 * baseline series; the organization-less variants serve the legacy {@link BaselineAssessmentDraftStore} port methods.
 * Draft transitions are compare-and-set updates returning their exact row count; the publication and tenant triggers
 * stay authoritative.
 */
public interface AssessmentVersionJpaRepository
        extends Repository<AssessmentVersionEntity, UUID>, InsertOnlyRepository<AssessmentVersionEntity> {
    record Header(UUID assessmentVersionId, UUID assessmentId, Integer version, String title, UUID blueprintId,
                  Integer blueprintVersion, Long generationSeed, UUID createdBy, Instant createdAt,
                  String generationRequestHash, String contentHash, Long draftRevision, String publicationState,
                  UUID reviewedBy, Instant reviewedAt, String reviewedContentHash) {}

    record CloneSource(UUID assessmentId, String title, String purpose, String scoringVersion, String contentHash,
                       UUID blueprintId, Integer blueprintVersion, Long generationSeed) {}

    String BASELINE_HEADER = """
            select new com.adaptlearngraph.repository.AssessmentVersionJpaRepository$Header(assessment.assessmentVersionId,
                assessment.assessmentId, assessment.version, assessment.title, assessment.blueprintId,
                assessment.blueprintVersion, assessment.generationSeed, assessment.createdBy, assessment.createdAt,
                assessment.generationRequestHash, assessment.contentHash, assessment.draftRevision,
                assessment.publicationState, assessment.reviewedBy, assessment.reviewedAt, assessment.reviewedContentHash)
            from AssessmentVersionEntity assessment
            join BaselineBlueprintEntity identity on identity.blueprintId = assessment.blueprintId
            where assessment.assessmentVersionId = :assessmentVersionId
              and assessment.purpose = 'BASELINE'
              and assessment.blueprintId is not null
            """;

    String IN_ORGANIZATION = """
             and exists (
                select 1 from BaselineBlueprintEntity identity
                where identity.blueprintId = assessment.blueprintId and identity.organizationId = :organizationId)
            """;

    String REVIEW = """
            update AssessmentVersionEntity assessment
            set assessment.reviewedBy = :reviewerId, assessment.reviewedAt = :reviewedAt,
                assessment.reviewedContentHash = :expectedContentHash
            where assessment.assessmentVersionId = :assessmentVersionId
              and assessment.purpose = 'BASELINE'
              and assessment.blueprintId is not null
              and assessment.publicationState = 'DRAFT'
              and assessment.contentHash = :expectedContentHash
              and assessment.reviewedContentHash is null
            """;

    String PUBLISH = """
            update AssessmentVersionEntity assessment
            set assessment.publicationState = 'PUBLISHED', assessment.baselineCandidateState = 'CLOSED'
            where assessment.assessmentVersionId = :assessmentVersionId
              and assessment.purpose = 'BASELINE'
              and assessment.blueprintId is not null
              and assessment.publicationState = 'DRAFT'
              and assessment.contentHash = :expectedContentHash
              and assessment.reviewedContentHash = :expectedContentHash
            """;

    /** Legacy unscoped read for the organization-less {@link BaselineAssessmentDraftStore#findByVersionId(UUID)}. */
    @Query(BASELINE_HEADER)
    List<Header> baselineHeader(@Param("assessmentVersionId") UUID assessmentVersionId);

    @Query(BASELINE_HEADER + " and identity.organizationId = :organizationId")
    List<Header> baselineHeader(@Param("organizationId") UUID organizationId,
            @Param("assessmentVersionId") UUID assessmentVersionId);

    /** Generation receipt lookup keyed by the generating account and its idempotency key. */
    @Query("""
            select assessment.assessmentVersionId from AssessmentVersionEntity assessment
            where assessment.createdBy = :actorId and assessment.generationIdempotencyKey = :idempotencyKey
              and assessment.blueprintId is not null
            """)
    List<UUID> byGenerationRequest(@Param("actorId") UUID actorId, @Param("idempotencyKey") String idempotencyKey);

    @Query("select coalesce(max(assessment.version), 0) from AssessmentVersionEntity assessment where assessment.assessmentId = :assessmentId")
    Integer latestVersion(@Param("assessmentId") UUID assessmentId);

    @Query("""
            select new com.adaptlearngraph.repository.AssessmentVersionJpaRepository$CloneSource(source.assessmentId, source.title,
                source.purpose, source.scoringVersion, source.contentHash, source.blueprintId, source.blueprintVersion,
                source.generationSeed)
            from AssessmentVersionEntity source
            join BaselineBlueprintEntity identity on identity.blueprintId = source.blueprintId
            where source.assessmentVersionId = :sourceId and source.purpose = 'BASELINE'
              and identity.organizationId = :organizationId
            """)
    List<CloneSource> cloneSource(@Param("organizationId") UUID organizationId, @Param("sourceId") UUID sourceAssessmentVersionId);

    /** Legacy unscoped review for the organization-less {@link BaselineAssessmentDraftStore} port method. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(REVIEW)
    int review(@Param("assessmentVersionId") UUID assessmentVersionId, @Param("reviewerId") UUID reviewerId,
            @Param("reviewedAt") Instant reviewedAt, @Param("expectedContentHash") String expectedContentHash);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(REVIEW + IN_ORGANIZATION)
    int review(@Param("organizationId") UUID organizationId, @Param("assessmentVersionId") UUID assessmentVersionId,
            @Param("reviewerId") UUID reviewerId, @Param("reviewedAt") Instant reviewedAt,
            @Param("expectedContentHash") String expectedContentHash);

    /** Legacy unscoped publication for the organization-less {@link BaselineAssessmentDraftStore} port method. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(PUBLISH)
    int publish(@Param("assessmentVersionId") UUID assessmentVersionId,
            @Param("expectedContentHash") String expectedContentHash);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(PUBLISH + IN_ORGANIZATION)
    int publish(@Param("organizationId") UUID organizationId, @Param("assessmentVersionId") UUID assessmentVersionId,
            @Param("expectedContentHash") String expectedContentHash);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update AssessmentVersionEntity assessment
            set assessment.title = :title, assessment.contentHash = :contentHash,
                assessment.draftRevision = assessment.draftRevision + 1
            where assessment.assessmentVersionId = :assessmentVersionId
              and assessment.draftRevision = :expectedRevision
              and assessment.publicationState = 'DRAFT'
              and assessment.reviewedContentHash is null
              and assessment.baselineCandidateState = 'OPEN'
            """ + IN_ORGANIZATION)
    int editManifest(@Param("organizationId") UUID organizationId, @Param("assessmentVersionId") UUID assessmentVersionId,
            @Param("expectedRevision") long expectedDraftRevision, @Param("title") String title,
            @Param("contentHash") String contentHash);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update AssessmentVersionEntity assessment
            set assessment.baselineCandidateState = 'CLOSED'
            where assessment.assessmentVersionId = :assessmentVersionId
              and assessment.baselineCandidateState = 'OPEN'
            """ + IN_ORGANIZATION)
    int closeCandidate(@Param("organizationId") UUID organizationId, @Param("assessmentVersionId") UUID assessmentVersionId);

    /** Answer keys of one organization's baseline assessment, in manifest order. Never mapped to a response DTO directly. */
    record AnswerKey(UUID itemVersionId, String protectedKey) {
        @Override public String toString() { return "AnswerKey[" + itemVersionId + "]"; }
    }

    @Query("""
            select new com.adaptlearngraph.repository.AssessmentVersionJpaRepository$AnswerKey(item.itemVersionId, item.protectedKey)
            from AssessmentVersionEntity assessment
            join BaselineAssessmentSeriesEntity series on series.blueprintId = assessment.blueprintId
            join AssessmentItemEntity manifest on manifest.assessmentVersionId = assessment.assessmentVersionId
            join ItemVersionEntity item on item.itemVersionId = manifest.itemVersionId
            where series.organizationId = :organization and assessment.assessmentVersionId = :assessment
              and assessment.purpose = 'BASELINE'
            order by manifest.itemPosition
            """)
    List<AnswerKey> answerKeys(@Param("organization") UUID organizationId, @Param("assessment") UUID assessmentVersionId);
}