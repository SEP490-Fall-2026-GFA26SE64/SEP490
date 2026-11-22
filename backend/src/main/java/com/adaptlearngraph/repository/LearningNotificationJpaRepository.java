package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.LearningNotificationEntity;
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
 * Learning notifications. In-app reads/writes are scoped by organization and recipient; the mail claim scans every
 * organization (worker) but only joins the recipient's account inside the notification's own organization.
 */
public interface LearningNotificationJpaRepository extends Repository<LearningNotificationEntity, UUID> {

    record Row(UUID id, String kind, String moduleId, String title, String body, Instant createdAt, Instant readAt,String deepLink,Instant toastObservedAt) {}

    record MailJob(UUID id, String kind, String moduleId, String title, String body, String recipient, String slug,
                   Integer attempts,String deepLink) {
        @Override public String toString() { return "LearningMailJob[id=" + id + "]"; }
    }

    // Native: INSERT ... ON CONFLICT DO NOTHING (one notification per recipient event key).
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "INSERT INTO platform.learning_notification(id, organization_id, recipient_id, event_key, kind, module_id,"
            + " title, body) VALUES (:id, :organization, :recipient, :key, :kind, :module, :title, :body)"
            + " ON CONFLICT (recipient_id, event_key) DO NOTHING", nativeQuery = true)
    int notify(@Param("id") UUID id, @Param("organization") String organizationId, @Param("recipient") String recipientId,
            @Param("key") String eventKey, @Param("kind") String kind, @Param("module") String moduleId,
            @Param("title") String title, @Param("body") String body);
    @Modifying(flushAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query(value="""
            INSERT INTO platform.learning_notification(id,organization_id,recipient_id,event_key,kind,title,body,deep_link)
            VALUES (:id,:org,:recipient,:key,:kind,:title,:body,:link)
            ON CONFLICT (recipient_id,event_key) DO NOTHING
            """,nativeQuery=true)
    int pathway(@Param("id") UUID id,@Param("org") String org,@Param("recipient") String recipient,@Param("key") String key,
                @Param("kind") String kind,@Param("title") String title,@Param("body") String body,@Param("link") String link);

    @Query(value="SELECT count(*)>0 FROM platform.account a JOIN platform.organization_membership m ON m.account_id=a.account_id AND m.organization_id=a.organization_id JOIN platform.organization_membership_role r ON r.membership_id=m.membership_id WHERE a.organization_id::text=:org AND a.account_id::text=:expert AND a.active AND m.active AND r.role_code='DOMAIN_EXPERT'",nativeQuery=true)
    boolean activeExpert(@Param("org") String org,@Param("expert") String expert);

    @Query("select new com.adaptlearngraph.repository.LearningNotificationJpaRepository$Row(n.id, n.kind, n.moduleId, n.title,"
            + " n.body, n.createdAt, n.readAt,n.deepLink,n.toastObservedAt) from LearningNotificationEntity n"
            + " where n.organizationId = :organization and n.recipientId = :recipient order by n.createdAt desc limit 100")
    List<Row> latest(@Param("organization") String organizationId, @Param("recipient") String recipientId);
    @Query("select new com.adaptlearngraph.repository.LearningNotificationJpaRepository$Row(n.id,n.kind,n.moduleId,n.title,n.body,n.createdAt,n.readAt,n.deepLink,n.toastObservedAt) from LearningNotificationEntity n where n.organizationId=:org and n.recipientId=:recipient and n.deepLink is not null and n.toastObservedAt is null order by n.createdAt,n.id limit 5")
    List<Row> pendingToast(@Param("org") String org,@Param("recipient") String recipient);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update LearningNotificationEntity n set n.readAt = coalesce(n.readAt, current_timestamp)"
            + " where n.organizationId = :organization and n.recipientId = :recipient and n.id = :id")
    int markRead(@Param("organization") String organizationId, @Param("recipient") String recipientId, @Param("id") UUID id);
    @Modifying(flushAutomatically=true) @Transactional(TransactionManagers.JPA)
    @Query("update LearningNotificationEntity n set n.toastObservedAt=current_timestamp where n.organizationId=:org and n.recipientId=:recipient and n.id=:id and n.toastObservedAt is null")
    int observe(@Param("org") String org,@Param("recipient") String recipient,@Param("id") UUID id);

    /** Only Employee pathway updates are mailed; staff requests remain in-app. Oldest due notification (database clock), skipping rows another worker holds. */
    // Native: FOR UPDATE OF n SKIP LOCKED claim with now()-based scheduling.
    @Query(value = """
            SELECT n.id FROM platform.learning_notification n
            JOIN platform.account a ON a.account_id::text = n.recipient_id AND a.organization_id::text = n.organization_id
            WHERE n.mail_sent_at IS NULL AND n.mail_attempts < 8 AND n.mail_next_attempt <= now() AND a.active
              AND n.kind IN ('RULE_PATHWAY_APPROVED','RULE_PATHWAY_REJECTED','RULE_PATHWAY_COMPLETED','PATHWAY_RECALCULATED','BYPASS_PROVISION_ADDED','CERTIFICATE_APPROVED','CERTIFICATE_REJECTED')
              AND n.deep_link LIKE '/employee/pathway%'
              AND EXISTS (SELECT 1 FROM platform.organization_membership m JOIN platform.organization_membership_role r ON r.membership_id=m.membership_id
                  WHERE m.account_id=a.account_id AND m.organization_id=a.organization_id AND m.active AND r.role_code='EMPLOYEE')
              AND NOT EXISTS (SELECT 1 FROM platform.organization_membership m JOIN platform.organization_membership_role r ON r.membership_id=m.membership_id
                  WHERE m.account_id=a.account_id AND m.organization_id=a.organization_id AND m.active AND r.role_code IN ('LD_MANAGER','DOMAIN_EXPERT','ORGANIZATION_ADMINISTRATOR','PLATFORM_ADMINISTRATOR'))
            ORDER BY n.created_at LIMIT 1 FOR UPDATE OF n SKIP LOCKED
            """, nativeQuery = true)
    Optional<UUID> lockNextMail();

    @Query("""
            select new com.adaptlearngraph.repository.LearningNotificationJpaRepository$MailJob(n.id, n.kind, n.moduleId, n.title,
                n.body, a.identifier,
                (select w.slug from OrganizationWorkspaceEntity w where cast(w.organizationId as String) = n.organizationId),
                n.mailAttempts,n.deepLink)
            from LearningNotificationEntity n
            join AccountEntity a on cast(a.accountId as String) = n.recipientId and cast(a.organizationId as String) = n.organizationId
            where n.id = :id
            """)
    List<MailJob> mailJob(@Param("id") UUID id);

    /** Fenced on the claimed attempt count so a stale worker can never record delivery twice. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update LearningNotificationEntity n set n.mailSentAt = current_timestamp, n.mailAttempts = n.mailAttempts + 1,"
            + " n.mailError = null where n.id = :id and n.mailSentAt is null and n.mailAttempts = :attempts")
    int markMailSent(@Param("id") UUID id, @Param("attempts") int claimedAttempts);

    // Native: now()-based backoff (interval scaled by the attempt count), fenced like markMailSent.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = "UPDATE platform.learning_notification SET mail_attempts = mail_attempts + 1,"
            + " mail_next_attempt = now() + interval '1 minute' * (mail_attempts + 1), mail_error = 'SMTP_UNAVAILABLE'"
            + " WHERE id = :id AND mail_sent_at IS NULL AND mail_attempts = :attempts", nativeQuery = true)
    int scheduleMailRetry(@Param("id") UUID id, @Param("attempts") int claimedAttempts);
}
