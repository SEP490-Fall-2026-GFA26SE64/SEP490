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
    List<Definition> definitionsOf(@Param("bank") UUID bankId);

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
}
