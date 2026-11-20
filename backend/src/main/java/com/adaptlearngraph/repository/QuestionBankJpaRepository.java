package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.QuestionBankEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization question bank. Every query is scoped by organization (the bank creator's organization or the workspace
 * document key). Locks, the jsonb document upsert and idempotent identity writes stay native.
 */
public interface QuestionBankJpaRepository extends Repository<QuestionBankEntity, UUID>, InsertOnlyRepository<QuestionBankEntity> {

    /** Current staff membership of the actor, share-locked as before ({@code FOR SHARE OF a,m,r,o}). */
    @Query(value = """
            SELECT a.account_id FROM platform.account a JOIN platform.organization_membership m USING(account_id)
            JOIN platform.organization_membership_role r USING(membership_id)
            JOIN platform.organization o ON o.organization_id = m.organization_id
            WHERE a.account_id = :actor AND a.organization_id = :organization AND m.organization_id = :organization
              AND a.active AND m.active AND o.status = 'ACTIVE' AND r.role_code = :role FOR SHARE OF a, m, r, o
            """, nativeQuery = true)
    List<UUID> lockStaffMembership(@Param("actor") UUID actorId, @Param("organization") UUID organizationId,
            @Param("role") String roleCode);

    @Query(value = "SELECT document::text FROM platform.question_bank_workspace WHERE organization_id = :organization FOR UPDATE",
            nativeQuery = true)
    List<String> lockDocument(@Param("organization") UUID organizationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.question_bank_workspace(organization_id, question_bank_id, document)
            VALUES (:organization, :bank, CAST(:document AS jsonb))
            ON CONFLICT(organization_id) DO UPDATE SET document = EXCLUDED.document
            """, nativeQuery = true)
    int saveDocument(@Param("organization") UUID organizationId, @Param("bank") UUID bankId, @Param("document") String document);

    @Query("""
            select b.questionBankId from QuestionBankEntity b join AccountEntity a on a.accountId = b.createdBy
            where a.organizationId = :organization order by b.createdAt, b.questionBankId
            """)
    List<UUID> banksOf(@Param("organization") UUID organizationId);

    @Modifying(flushAutomatically = true)
    @Query(value="""
            INSERT INTO platform.question_bank_scope(organization_id,question_bank_id)
            SELECT :organization,b.question_bank_id FROM platform.question_bank b
            JOIN platform.account a ON a.account_id=b.created_by
            WHERE b.question_bank_id=:bank AND a.organization_id=:organization
            ON CONFLICT(organization_id,question_bank_id) DO NOTHING
            """,nativeQuery=true)
    int registerScope(@Param("organization") UUID organization,@Param("bank") UUID bank);

    @Query("select b.name from QuestionBankEntity b where b.questionBankId = :bank")
    Optional<String> name(@Param("bank") UUID bankId);

    /** Retires/keeps a question only when its bank and code are unchanged; any identity change affects 0 rows. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.question_bank_identity(question_id, question_bank_id, code, retired) VALUES (:question, :bank, :code, :retired)
            ON CONFLICT(question_id) DO UPDATE SET retired = EXCLUDED.retired
            WHERE question_bank_identity.question_bank_id = EXCLUDED.question_bank_id AND question_bank_identity.code = EXCLUDED.code
            """, nativeQuery = true)
    int projectIdentity(@Param("question") UUID questionId, @Param("bank") UUID bankId, @Param("code") String code,
            @Param("retired") boolean retired);
}
