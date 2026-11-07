package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.CertificateSubmissionEntity;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Organization/learner scoped submission, private attachment and immutable actual Expert decision commands. */
public interface CertificateSubmissionJpaRepository extends Repository<CertificateSubmissionEntity,UUID> {
    String READ="""
            SELECT s.id AS id,s.organization_id AS organizationId,s.learner_id AS learnerId,s.revision AS revision,s.status AS status,
                s.skill_id AS skillId,s.knowledge_level AS knowledgeLevel,s.definition_id AS definitionId,s.definition_version AS definitionVersion,
                s.definition_snapshot::text AS definitionSnapshot,s.submitted_at AS submittedAt,s.replaces_submission_id AS replacesSubmissionId,
                a.evidence_kind AS evidenceKind,a.https_url AS httpsUrl,a.private_object_key AS privateObjectKey,a.media_type AS mediaType,
                a.byte_size AS byteSize,a.content_hash AS contentHash,d.decision AS decision,d.reason AS reason,d.decided_at AS decidedAt,d.expert_id AS expertId
            FROM platform.certificate_submission s JOIN platform.certificate_submission_attachment a ON a.submission_id=s.id
            LEFT JOIN platform.certificate_submission_decision d ON d.submission_id=s.id AND d.submission_revision=s.revision AND d.organization_id=s.organization_id
            """;
    interface Row {
        UUID getId();UUID getOrganizationId();UUID getLearnerId();long getRevision();String getStatus();String getSkillId();String getKnowledgeLevel();
        String getDefinitionId();String getDefinitionVersion();String getDefinitionSnapshot();Instant getSubmittedAt();UUID getReplacesSubmissionId();
        String getEvidenceKind();String getHttpsUrl();String getPrivateObjectKey();String getMediaType();Long getByteSize();String getContentHash();
        String getDecision();String getReason();Instant getDecidedAt();UUID getExpertId();
    }
    @Query(value="""
            SELECT DISTINCT r.request_id,r.frozen_input->'input'->'binding'->>'roleId' AS role_id
            FROM platform.certificate_submission s JOIN platform.initial_pathway_request r ON r.request_id=CAST(s.definition_snapshot->>'requestId' AS uuid)
                AND r.organization_id=s.organization_id AND r.learner_id=s.learner_id AND r.requirement_snapshot_id IS NOT NULL
            WHERE s.organization_id=:org AND s.status='PENDING' ORDER BY r.request_id LIMIT :maximum
            """,nativeQuery=true)
    List<Object[]> pendingRoles(@Param("org") UUID org,@Param("maximum") long maximum);
    @Query(value=READ+" WHERE s.organization_id=:org AND s.learner_id=:learner AND s.id=:id",nativeQuery=true)
    Optional<Row> own(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    @Query(value=READ+" WHERE s.organization_id=:org AND s.id=:id",nativeQuery=true)
    Optional<Row> inOrganization(@Param("org") UUID org,@Param("id") UUID id);
    @Query(value=READ+" WHERE s.organization_id=:org AND s.learner_id=:learner AND s.definition_snapshot->>'requestId'=CAST(:request AS text) AND s.definition_snapshot->>'stepId'=CAST(:step AS text) ORDER BY s.submitted_at DESC,s.id LIMIT :limit OFFSET :offset",nativeQuery=true)
    List<Row> history(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("step") UUID step,@Param("offset") int offset,@Param("limit") int limit);
    @Query(value=READ+" WHERE s.organization_id=:org AND s.status='PENDING' AND CAST(s.definition_snapshot->>'requestId' AS uuid) IN (:requests) ORDER BY s.submitted_at,s.id LIMIT :limit OFFSET :offset",nativeQuery=true)
    List<Row> queue(@Param("org") UUID org,@Param("requests") Collection<UUID> requests,@Param("offset") int offset,@Param("limit") int limit);
    @Query(value="SELECT id FROM platform.certificate_submission WHERE organization_id=:org AND learner_id=:learner AND id=:id FOR UPDATE",nativeQuery=true)
    Optional<UUID> lock(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id);
    @Query(value="""
            SELECT EXISTS (SELECT 1 FROM platform.certificate_submission WHERE organization_id=:org AND learner_id=:learner
                AND definition_snapshot->>'requestId'=CAST(:request AS text) AND definition_snapshot->>'stepId'=CAST(:step AS text) AND status='PENDING')
            """,nativeQuery=true)
    boolean pending(@Param("org") UUID org,@Param("learner") UUID learner,@Param("request") UUID request,@Param("step") UUID step);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.certificate_submission(id,organization_id,learner_id,skill_id,knowledge_level,definition_id,definition_version,
                definition_snapshot,revision,status,submitted_at,replaces_submission_id)
            VALUES (:id,:org,:learner,:skill,:level,:definition,:version,CAST(:snapshot AS jsonb),1,'PENDING',clock_timestamp(),:replaces)
            """,nativeQuery=true)
    int submit(@Param("id") UUID id,@Param("org") UUID org,@Param("learner") UUID learner,@Param("skill") String skill,@Param("level") String level,
            @Param("definition") String definition,@Param("version") String version,@Param("snapshot") String snapshot,@Param("replaces") UUID replaces);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.certificate_submission_attachment(submission_id,evidence_kind,https_url,private_object_key,media_type,byte_size,content_hash)
            VALUES (:id,:kind,:url,:object,:media,:bytes,:hash)
            """,nativeQuery=true)
    int attachment(@Param("id") UUID id,@Param("kind") String kind,@Param("url") String url,@Param("object") String object,
            @Param("media") String media,@Param("bytes") Long bytes,@Param("hash") String hash);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="UPDATE platform.certificate_submission SET status=:decision WHERE organization_id=:org AND learner_id=:learner AND id=:id AND revision=:revision AND status='PENDING'",nativeQuery=true)
    int decide(@Param("org") UUID org,@Param("learner") UUID learner,@Param("id") UUID id,@Param("revision") long revision,@Param("decision") String decision);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.certificate_submission_decision(id,organization_id,submission_id,submission_revision,decision,expert_id,assignment_snapshot,reason,decided_at,retry_key)
            VALUES (:id,:org,:submission,:revision,:decision,:expert,CAST(:assignment AS jsonb),:reason,clock_timestamp(),:retry)
            """,nativeQuery=true)
    int decision(@Param("id") UUID id,@Param("org") UUID org,@Param("submission") UUID submission,@Param("revision") long revision,@Param("decision") String decision,
            @Param("expert") UUID expert,@Param("assignment") String assignment,@Param("reason") String reason,@Param("retry") UUID retry);
    @Modifying @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.skill_knowledge_evidence(id,organization_id,learner_id,skill_id,knowledge_level,requirement_snapshot,source_kind,source_id,source_version,achieved_at)
            SELECT :id,s.organization_id,s.learner_id,s.skill_id,s.knowledge_level,CAST(:snapshot AS jsonb),'CERTIFICATE',s.id,s.revision,clock_timestamp()
            FROM platform.certificate_submission s JOIN platform.certificate_submission_decision d ON d.submission_id=s.id AND d.submission_revision=s.revision AND d.organization_id=s.organization_id AND d.decision='APPROVED'
            WHERE s.id=:submission AND s.organization_id=:org AND s.learner_id=:learner AND s.status='APPROVED'
            ON CONFLICT(organization_id,learner_id,skill_id,knowledge_level,source_kind,source_id,source_version) DO NOTHING
            """,nativeQuery=true)
    int evidence(@Param("id") UUID id,@Param("org") UUID org,@Param("learner") UUID learner,@Param("submission") UUID submission,@Param("snapshot") String snapshot);
}
