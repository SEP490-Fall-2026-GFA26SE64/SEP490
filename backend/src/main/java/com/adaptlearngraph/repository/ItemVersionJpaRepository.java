package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.ItemVersionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Item definitions of one bank. Rows include the answer key and are only consumed inside the persistence layer. */
public interface ItemVersionJpaRepository extends Repository<ItemVersionEntity, UUID>, InsertOnlyRepository<ItemVersionEntity> {
    record Definition(UUID itemId, UUID itemVersionId, Integer version, String publicationState, String prompt,
                      String responseSchema, String protectedKey, String microSkillId, String microSkillNameSnapshot,
                      String difficulty) {
        @Override public String toString() { return "ItemDefinition[" + itemVersionId + "]"; }
    }

    @Query("""
            select new com.adaptlearngraph.repository.ItemVersionJpaRepository$Definition(i.itemId, i.itemVersionId, i.version,
                i.publicationState, i.prompt, i.responseSchema, i.protectedKey, i.microSkillId, i.microSkillNameSnapshot, i.difficulty)
            from ItemVersionEntity i where i.questionBankId = :bank order by i.itemId, i.version
            """)
    List<Definition> definitionsOf(@Param("bank") UUID bankId,org.springframework.data.domain.Pageable page);
    default List<Definition> definitionsOf(UUID bankId){return definitionsOf(bankId,org.springframework.data.domain.PageRequest.of(0,10001));}

    @Query("""
            select count(own) > 0 from ItemVersionEntity own join ItemVersionEntity other on other.itemId = own.itemId
            where own.questionBankId = :bank and other.questionBankId <> :bank
            """)
    boolean spansOtherBanks(@Param("bank") UUID bankId);

    @Query("""
            select i.publicationState from ItemVersionEntity i
            where i.itemVersionId = :id and i.itemId = :item and i.questionBankId = :bank and i.version = :version
            """)
    List<String> states(@Param("id") UUID itemVersionId, @Param("item") UUID itemId, @Param("bank") UUID bankId,
            @Param("version") int version);

    /** Approves a legacy DRAFT in place; affects 0 rows if it is no longer a draft. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.item_version SET prompt = :prompt, response_schema = CAST(:schema AS jsonb), protected_key = CAST(:key AS jsonb),
              content_hash = :hash, micro_skill_id = :skill, micro_skill_name_snapshot = :skillName, difficulty = :difficulty,
              publication_state = 'PUBLISHED'
            WHERE item_version_id = :id AND publication_state = 'DRAFT'
            """, nativeQuery = true)
    int publishDraft(@Param("id") UUID itemVersionId, @Param("prompt") String prompt, @Param("schema") String responseSchema,
            @Param("key") String protectedKey, @Param("hash") String contentHash, @Param("skill") String microSkillId,
            @Param("skillName") String microSkillName, @Param("difficulty") String difficulty);

    /** Exact (possibly superseded) definition of an item in the organization's own bank; drafts only when explicitly allowed. */
    record Owned(UUID itemVersionId, String prompt, String responseSchema, String protectedKey) {
        @Override public String toString() { return "OwnedItem[" + itemVersionId + "]"; }
    }

    @Query("""
            select new com.adaptlearngraph.repository.ItemVersionJpaRepository$Owned(item.itemVersionId, item.prompt,
                item.responseSchema, item.protectedKey)
            from ItemVersionEntity item join QuestionBankEntity bank on bank.questionBankId = item.questionBankId
            join AccountEntity owner on owner.accountId = bank.createdBy and owner.organizationId = :org
            where item.itemVersionId = :item and item.questionBankId = :bank
              and (item.publicationState = 'PUBLISHED' or (:demoDraft = true and item.publicationState = 'DRAFT'))
            """)
    List<Owned> owned(@Param("org") UUID organizationId, @Param("bank") UUID bankId, @Param("item") UUID itemVersionId,
            @Param("demoDraft") boolean demoDraft);

    /** Answer-safe preview row: deliberately excludes the protected answer key. */
    record Preview(UUID itemVersionId, String microSkillId, String prompt, String responseSchema) {}

    @Query("""
            select new com.adaptlearngraph.repository.ItemVersionJpaRepository$Preview(item.itemVersionId, item.microSkillId, item.prompt,
                item.responseSchema)
            from ItemVersionEntity item join QuestionBankEntity bank on bank.questionBankId = item.questionBankId
            join AccountEntity owner on owner.accountId = bank.createdBy and owner.organizationId = :org
            where item.questionBankId = :bank and item.itemVersionId in :ids
              and ((item.publicationState = 'PUBLISHED'
                    and not exists (select 1 from QuestionBankIdentityEntity qb where qb.questionId = item.itemId and qb.retired = true))
                   or (:demoDraft = true and item.publicationState = 'DRAFT'))
              and not exists (select 1 from ItemVersionEntity newer where newer.itemId = item.itemId and newer.version > item.version)
            order by item.itemVersionId
            """)
    List<Preview> preview(@Param("org") UUID organizationId, @Param("bank") UUID bankId, @Param("ids") java.util.Collection<UUID> ids,
            @Param("demoDraft") boolean demoDraft);

    /**
     * Published coverage per micro-skill and difficulty, counting only each item's latest published version among the
     * requested skills. Native: PostgreSQL DISTINCT ON has no exact JPQL equivalent. Rows: [micro_skill_id, difficulty, count].
     */
    @Query(value = """
            WITH latest_published AS (
                SELECT DISTINCT ON (item_id) item_id, micro_skill_id, difficulty
                FROM platform.item_version
                WHERE publication_state = 'PUBLISHED'
                  AND micro_skill_id IN (:skillIds)
                ORDER BY item_id, version DESC, item_version_id DESC
            )
            SELECT micro_skill_id, difficulty, count(*) AS available_count
            FROM latest_published
            GROUP BY micro_skill_id, difficulty
            """, nativeQuery = true)
    List<Object[]> publishedCoverage(@Param("skillIds") java.util.Collection<String> microSkillIds);

    @Query("""
            select count(bank) > 0 from QuestionBankEntity bank join AccountEntity owner on owner.accountId = bank.createdBy
            where bank.questionBankId = :bank and owner.organizationId = :organization
            """)
    boolean bankOwnedBy(@Param("bank") UUID bankId, @Param("organization") UUID organizationId);

    /**
     * Answer-safe fixed baseline generation candidates: each item's latest published, non-retired version among the
     * requested skills. Native: PostgreSQL DISTINCT ON has no exact JPQL equivalent. Rows: [item_version_id,
     * micro_skill_id, micro_skill_name_snapshot, difficulty, content_hash, prompt, response_schema_json].
     */
    @Query(value = """
            WITH latest_published AS (
                SELECT DISTINCT ON (item_id)
                       item_version_id, item_id, version, micro_skill_id,
                       micro_skill_name_snapshot, difficulty, content_hash,
                       prompt, response_schema
                FROM platform.item_version
                WHERE publication_state = 'PUBLISHED' AND NOT EXISTS (SELECT 1 FROM platform.question_bank_identity qb WHERE qb.question_id=item_version.item_id AND qb.retired)
                  AND micro_skill_id IN (:skillIds)
                ORDER BY item_id, version DESC, item_version_id DESC
            )
            SELECT item_version_id, micro_skill_id, micro_skill_name_snapshot,
                   difficulty, content_hash, prompt, response_schema::text AS response_schema_json
            FROM latest_published
            ORDER BY micro_skill_id, difficulty, item_version_id
            """, nativeQuery = true)
    List<Object[]> publishedCandidates(@Param("skillIds") java.util.Collection<String> microSkillIds);

    /** Published replacement candidates for an assessment manifest edit; deliberately excludes the answer key. */
    record Editable(UUID itemVersionId, String microSkillId, String difficulty, String contentHash) {}

    @Query("""
            select new com.adaptlearngraph.repository.ItemVersionJpaRepository$Editable(item.itemVersionId, item.microSkillId,
                item.difficulty, item.contentHash)
            from ItemVersionEntity item
            where item.itemVersionId in :ids and item.publicationState = 'PUBLISHED'
            """)
    List<Editable> editable(@Param("ids") java.util.Collection<UUID> itemVersionIds);

    /**
     * Adaptive eligibility pool of the organization's own bank. Latest identity first: a draft/remapped/incomplete successor
     * never resurrects an older published version; drafts are admitted only when {@code demoDraft} is set. Protected data
     * is inspected only inside PostgreSQL; no answer/key/text leaves this query. Native: DISTINCT ON, LATERAL
     * jsonb_array_elements and jsonb operators. Rows: [item_version_id, micro_skill_id, content_hash].
     */
    @Query(value = """
            WITH latest AS (
                SELECT DISTINCT ON (item.item_id) item.* FROM platform.item_version item
                WHERE EXISTS (SELECT 1 FROM platform.item_version original
                    WHERE original.item_id=item.item_id AND original.question_bank_id=:bank)
                ORDER BY item.item_id,item.version DESC,item.item_version_id
            )
            SELECT item.item_version_id,item.micro_skill_id,item.content_hash
            FROM latest item
            JOIN platform.question_bank bank ON bank.question_bank_id=item.question_bank_id
            JOIN platform.account owner ON owner.account_id=bank.created_by AND owner.organization_id=:organization
            CROSS JOIN LATERAL (
                SELECT count(*) AS total,count(DISTINCT option->>'id') AS distinct_ids,
                    bool_and(coalesce(jsonb_typeof(option->'id')='string' AND btrim(option->>'id')<>''
                        AND option->>'id'=btrim(option->>'id') AND jsonb_typeof(option->'text')='string'
                        AND btrim(option->>'text')<>'',false)) AS valid,
                    bool_or(option->>'id'=item.protected_key->>'correctOptionId') AS has_key
                FROM jsonb_array_elements(CASE WHEN jsonb_typeof(item.response_schema->'options')='array'
                    THEN item.response_schema->'options' ELSE '[]'::jsonb END) option
            ) options
            WHERE item.question_bank_id=:bank
                AND (CASE WHEN :demoDraft THEN item.publication_state IN ('DRAFT','PUBLISHED')
                     ELSE item.publication_state='PUBLISHED' AND NOT EXISTS (SELECT 1 FROM platform.question_bank_identity qb WHERE qb.question_id=item.item_id AND qb.retired) END)
                AND item.micro_skill_id IN (:skills) AND btrim(item.prompt)<>''
                AND btrim(item.micro_skill_name_snapshot)<>'' AND item.difficulty IN ('EASY','MEDIUM','HARD')
                AND item.response_schema->>'type'='SINGLE_CHOICE'
                AND jsonb_typeof(item.protected_key->'correctOptionId')='string'
                AND options.total>=2 AND options.total=options.distinct_ids AND options.valid AND options.has_key
            ORDER BY item.item_version_id
            """, nativeQuery = true)
    List<Object[]> eligiblePool(@Param("organization") UUID organizationId, @Param("bank") UUID bankId,
            @Param("skills") java.util.Collection<String> microSkillIds, @Param("demoDraft") boolean demoDraft);
}
