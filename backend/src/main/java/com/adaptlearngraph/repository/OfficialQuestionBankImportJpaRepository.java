package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.QuestionBankEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Official question bank import (DRAFT-only, insert-only). The preflight reads share-lock the creator, tenant, bank and
 * items ({@code FOR SHARE}), so they stay native; inserts go through {@link QuestionBankJpaRepository} and
 * {@link ItemVersionJpaRepository}. All statements run inside the importer's single JPA transaction.
 */
public interface OfficialQuestionBankImportJpaRepository extends Repository<QuestionBankEntity, UUID>, PostgresConnectionUrl {
    // Native: transaction-local timeouts (set_config(..., true) is SET LOCAL).
    @Query(value = "SELECT set_config('lock_timeout','10s',true), set_config('statement_timeout','60s',true)", nativeQuery = true)
    List<Object[]> limitTransaction();

    // Native: FOR SHARE OF actor,tenant keeps the creator and its tenant active until commit.
    @Query(value = """
            SELECT actor.account_id FROM platform.account actor
            JOIN platform.organization tenant ON tenant.organization_id=actor.organization_id
            WHERE actor.account_id=:account AND actor.organization_id=:org AND actor.active AND tenant.status='ACTIVE'
            FOR SHARE OF actor,tenant
            """, nativeQuery = true)
    List<UUID> lockActiveCreator(@Param("account") UUID accountId, @Param("org") UUID organizationId);

    // Native: FOR SHARE keeps the administrator role until commit.
    @Query(value = """
            SELECT role_code FROM platform.account_role WHERE account_id=:account
              AND role_code IN ('ADMINISTRATOR','PLATFORM_ADMINISTRATOR') FOR SHARE
            """, nativeQuery = true)
    List<String> lockAdministratorRoles(@Param("account") UUID accountId);

    /** Columns: [name, created_by]. */
    // Native: FOR SHARE keeps the existing bank identity stable until commit.
    @Query(value = "SELECT name,created_by FROM platform.question_bank WHERE question_bank_id=:bank FOR SHARE", nativeQuery = true)
    List<Object[]> lockBank(@Param("bank") UUID bankId);

    /**
     * Columns: [item_version_id, item_id, version, question_bank_id, prompt, response_schema, protected_key,
     * publication_state, content_hash, micro_skill_id, micro_skill_name_snapshot, difficulty]; jsonb as text.
     */
    // Native: FOR SHARE keeps existing item versions stable until commit.
    @Query(value = """
            SELECT item_version_id,item_id,version,question_bank_id,prompt,response_schema::text,protected_key::text,
              publication_state,content_hash::text,micro_skill_id,micro_skill_name_snapshot,difficulty
            FROM platform.item_version WHERE item_version_id=:itemVersion OR item_id=:item FOR SHARE
            """, nativeQuery = true)
    List<Object[]> lockItems(@Param("itemVersion") UUID itemVersionId, @Param("item") UUID itemId);
}