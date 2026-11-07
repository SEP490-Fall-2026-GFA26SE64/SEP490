package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.QuestionBankEntity;
import java.time.Instant;
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
 * document key). Locks, the jsonb document upsert and idempotent identity/notice writes stay native.
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

    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.question_bank_mail(notice_id, organization_id, recipient, title, body, created_at)
            VALUES (:notice, :organization, :recipient, :title, :body, :createdAt) ON CONFLICT(notice_id) DO NOTHING
            """, nativeQuery = true)
    int queueNotice(@Param("notice") UUID noticeId, @Param("organization") UUID organizationId, @Param("recipient") UUID recipient,
            @Param("title") String title, @Param("body") String body, @Param("createdAt") Instant createdAt);

    record Notice(UUID noticeId, String email, String title, String body, Integer attempts, String role, String slug) {
        @Override public String toString() { return "QuestionBankNotice[id=" + noticeId + "]"; }
    }

    /** Next deliverable notice for an active Expert/L&D recipient of the same organization (database clock, as before). */
    @Query(value = """
            SELECT n.notice_id FROM platform.question_bank_mail n
            JOIN platform.account a ON a.account_id = n.recipient AND a.organization_id = n.organization_id
            JOIN platform.organization_membership m ON m.account_id = a.account_id AND m.organization_id = n.organization_id
            JOIN platform.organization_membership_role r USING(membership_id)
            WHERE a.active AND m.active AND r.role_code IN ('DOMAIN_EXPERT','LD_MANAGER')
              AND ((n.status IN ('PENDING','RETRY') AND n.next_attempt <= now()) OR (n.status = 'RUNNING' AND n.lease_until < now()))
            ORDER BY n.created_at LIMIT 1 FOR UPDATE OF n SKIP LOCKED
            """, nativeQuery = true)
    Optional<UUID> lockNextNotice();

    @Query("""
            select new com.adaptlearngraph.repository.QuestionBankJpaRepository$Notice(n.noticeId, a.identifier, n.title, n.body,
                n.attempts, r.roleCode, (select w.slug from OrganizationWorkspaceEntity w where w.organizationId = n.organizationId))
            from QuestionBankMailEntity n join AccountEntity a on a.accountId = n.recipient and a.organizationId = n.organizationId
            join OrganizationMembershipEntity m on m.accountId = a.accountId and m.organizationId = n.organizationId
            join OrganizationMembershipRoleEntity r on r.membershipId = m.membershipId
            where n.noticeId = :notice and r.roleCode in ('DOMAIN_EXPERT', 'LD_MANAGER')
            """)
    List<Notice> notice(@Param("notice") UUID noticeId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.question_bank_mail SET status = 'RUNNING', attempts = attempts + 1, lease_owner = :lease,
              lease_until = now() + interval '120 seconds' WHERE notice_id = :notice
            """, nativeQuery = true)
    int leaseNotice(@Param("notice") UUID noticeId, @Param("lease") UUID lease);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            UPDATE platform.question_bank_mail SET status = :status, error_code = :error, next_attempt = now() + interval '30 seconds',
              lease_owner = NULL, lease_until = NULL WHERE notice_id = :notice AND lease_owner = :lease AND status = 'RUNNING'
            """, nativeQuery = true)
    int releaseNotice(@Param("notice") UUID noticeId, @Param("lease") UUID lease, @Param("status") String status,
            @Param("error") String errorCode);
}
