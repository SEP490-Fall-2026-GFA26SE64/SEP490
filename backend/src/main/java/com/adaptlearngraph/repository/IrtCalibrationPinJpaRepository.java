package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.IrtCalibrationRunEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Share-locked model, bank-ownership and item-content pins verified by calibration preflight/completion and promotion.
 * All reads stay native: they take FOR SHARE row locks and the item content is the jsonb_build_object document whose
 * canonical hash is the pinned content hash. Methods are read-write transactional so the locks are legal when called
 * outside a scope transaction (one short transaction per statement, as the former autocommit reads) and join it otherwise.
 */
public interface IrtCalibrationPinJpaRepository extends Repository<IrtCalibrationRunEntity, UUID> {
    String MODEL = """
            SELECT algorithm,configuration::text,parameter_hash::text,version,artifact_ref,approved_by,approved_at
            FROM platform.model_version WHERE model_version_id=:model
            """;
    String ITEM_CONTENT = """
            SELECT i.item_version_id,i.micro_skill_id,i.content_hash::text,
              jsonb_build_object('itemVersionId',i.item_version_id,'itemId',i.item_id,'version',i.version,
                'microSkillId',i.micro_skill_id,'microSkillName',i.micro_skill_name_snapshot,'difficulty',i.difficulty,
                'prompt',i.prompt,'responseSchema',i.response_schema,'protectedKey',i.protected_key,
                'publicationState',i.publication_state,'questionBankId',i.question_bank_id)::text AS content
            FROM platform.item_version i WHERE i.question_bank_id=:bank
            """;

    /** Bank ids owned by an active account of the active organization (0 or 1). */
    // FOR SHARE OF several joined tables.
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            SELECT b.question_bank_id FROM platform.question_bank b JOIN platform.account a ON a.account_id=b.created_by
            JOIN platform.organization o ON o.organization_id=a.organization_id
            WHERE b.question_bank_id=:bank AND a.organization_id=:org AND a.active AND o.status='ACTIVE' FOR SHARE OF b,a,o
            """, nativeQuery = true)
    List<UUID> activeBankOwner(@Param("bank") UUID bankId, @Param("org") UUID organizationId);

    /** Columns: [algorithm, configuration, parameter_hash, version, artifact_ref, approved_by, approved_at]. */
    // FOR SHARE row lock.
    @Transactional(TransactionManagers.JPA)
    @Query(value = MODEL + " FOR SHARE", nativeQuery = true)
    List<Object[]> model(@Param("model") UUID modelVersionId);

    /** Same columns as {@link #model}, restricted to IRT_3PL. */
    // FOR SHARE row lock.
    @Transactional(TransactionManagers.JPA)
    @Query(value = MODEL + " AND algorithm='IRT_3PL' FOR SHARE", nativeQuery = true)
    List<Object[]> irtModel(@Param("model") UUID modelVersionId);

    // FOR SHARE row lock.
    @Transactional(TransactionManagers.JPA)
    @Query(value = "SELECT configuration::text FROM platform.model_version WHERE model_version_id=:model FOR SHARE", nativeQuery = true)
    List<String> modelConfiguration(@Param("model") UUID modelVersionId);

    /** Columns: [item_version_id, micro_skill_id, content_hash, content] for every bank item, ordered by id. */
    // jsonb_build_object content document and FOR SHARE row locks.
    @Transactional(TransactionManagers.JPA)
    @Query(value = ITEM_CONTENT + " ORDER BY i.item_version_id FOR SHARE OF i", nativeQuery = true)
    List<Object[]> bankItemContents(@Param("bank") UUID bankId);

    /** Same columns as {@link #bankItemContents} for the given bank items. */
    // jsonb_build_object content document and FOR SHARE row locks.
    @Transactional(TransactionManagers.JPA)
    @Query(value = ITEM_CONTENT + " AND i.item_version_id IN (:items) FOR SHARE OF i", nativeQuery = true)
    List<Object[]> itemContents(@Param("bank") UUID bankId, @Param("items") Collection<UUID> itemVersionIds);
}
