package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.PaymentOrder;
import com.adaptlearngraph.entities.PaymentOrderEntity;
import com.adaptlearngraph.entities.PlanTerms;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Payment orders with their intent. Reads go through the {@link Row} projection; state changes are conditional JPQL
 * updates of progress columns only (the plan-terms snapshot is immutable in the database).
 */
public interface PaymentOrderJpaRepository extends Repository<PaymentOrderEntity, UUID>, InsertOnlyRepository<PaymentOrderEntity> {
    String ROW = """
            select new com.adaptlearngraph.repository.PaymentOrderJpaRepository$Row(o.orderId, o.intentId, i.kind,
                i.registrationId, i.organizationId, i.ownerAccountId, o.planId, o.planVersionId, o.name, o.description,
                o.priceVnd, o.currency, o.durationMonths, o.employeeSeats, o.providerOrderCode, o.paymentStatus,
                o.paymentLinkId, o.checkoutUrl, o.observedPaidAmount, o.createdAt, o.expiresAt, o.paidAt, o.failureCode,
                o.attempt)
            from PaymentOrderEntity o join SubscriptionIntentEntity i on i.intentId = o.intentId
            """;

    record Row(UUID orderId, UUID intentId, String kind, UUID registrationId, UUID organizationId, UUID ownerAccountId,
               UUID planId, UUID planVersionId, String name, String description, Long priceVnd, String currency,
               Integer durationMonths, Integer employeeSeats, Long providerOrderCode, String paymentStatus,
               String paymentLinkId, String checkoutUrl, Long observedPaidAmount, Instant createdAt, Instant expiresAt,
               Instant paidAt, String failureCode, Integer attempt) {
        public PaymentOrder order() {
            return new PaymentOrder(orderId, intentId, kind, registrationId, organizationId, ownerAccountId, planId,
                    planVersionId, new PlanTerms(name, description, priceVnd, currency, durationMonths, employeeSeats),
                    providerOrderCode, paymentStatus, paymentLinkId, checkoutUrl, observedPaidAmount, createdAt, expiresAt,
                    paidAt, failureCode, attempt);
        }
    }

    @Query(ROW + "where o.orderId = :orderId")
    Optional<Row> row(@Param("orderId") UUID orderId);

    @Query(ROW + "where o.providerOrderCode = :code")
    Optional<Row> byProviderCode(@Param("code") long providerOrderCode);

    @Query(ROW + "where o.createdBy = :actor and o.idempotencyKey = :key")
    Optional<Row> byCommandKey(@Param("actor") UUID actor, @Param("key") UUID idempotencyKey);

    @Query("select o.requestDigest from PaymentOrderEntity o where o.orderId = :orderId")
    Optional<String> requestDigest(@Param("orderId") UUID orderId);

    @Query(ROW + "where i.registrationId = :registration and i.ownerAccountId = :owner order by o.createdAt desc, o.attempt desc")
    List<Row> latestOfRegistration(@Param("registration") UUID registrationId, @Param("owner") UUID owner, Pageable first);

    @Query(ROW + "where i.organizationId = :organization order by o.createdAt desc, o.attempt desc")
    List<Row> latestOfOrganization(@Param("organization") UUID organizationId, Pageable first);

    /** Organization billing history, including the initial purchase made by its registration. */
    @Query(ROW + """
            left join OrganizationWorkspaceEntity w on w.registrationId = i.registrationId
            where i.organizationId = :organization or w.organizationId = :organization
            order by o.createdAt desc, o.attempt desc
            """)
    List<Row> historyOf(@Param("organization") UUID organizationId);

    @Query(value = """
            SELECT o.order_id FROM platform.payment_order o WHERE o.intent_id = :intent
            ORDER BY o.attempt DESC LIMIT 1 FOR UPDATE OF o
            """, nativeQuery = true)
    Optional<UUID> lockLatestOfIntent(@Param("intent") UUID intentId);

    @Query(value = "SELECT order_id FROM platform.payment_order WHERE order_id = :orderId FOR UPDATE", nativeQuery = true)
    Optional<UUID> lock(@Param("orderId") UUID orderId);

    @Query("""
            select case when i.state = 'EXCEPTION' then 'EXCEPTION' else coalesce(a.state, 'NOT_APPLIED') end
            from PaymentOrderEntity o join SubscriptionIntentEntity i on i.intentId = o.intentId
            left join PaymentApplicationEntity a on a.orderId = o.orderId where o.orderId = :orderId
            """)
    Optional<String> applicationState(@Param("orderId") UUID orderId);

    boolean existsBySupersedesOrderId(UUID orderId);

    @Query("""
            select min(o.employeeSeats) from PaymentOrderEntity o join SubscriptionIntentEntity i on i.intentId = o.intentId
            where i.organizationId = :organization and i.state in ('OPEN', 'WAITING_CAPACITY', 'EXCEPTION')
              and o.paymentStatus in ('CREATING', 'PENDING', 'UNKNOWN', 'PARTIAL', 'PAID', 'EXCEPTION')
            """)
    Integer pendingSeats(@Param("organization") UUID organizationId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update PaymentOrderEntity o set o.revision = o.revision + 1 where o.orderId = :orderId")
    int bumpRevision(@Param("orderId") UUID orderId);

    @Query("select o.revision from PaymentOrderEntity o where o.orderId = :orderId")
    Optional<Long> revision(@Param("orderId") UUID orderId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update PaymentOrderEntity o set o.paymentLinkId = :link where o.orderId = :orderId")
    int bindPaymentLink(@Param("orderId") UUID orderId, @Param("link") String paymentLinkId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update PaymentOrderEntity o set o.checkoutUrl = :url where o.orderId = :orderId")
    int checkoutUrl(@Param("orderId") UUID orderId, @Param("url") String checkoutUrl);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update PaymentOrderEntity o set o.paymentStatus = 'PAID', o.observedPaidAmount = :paid, o.paidAt = :now,
                o.providerStatus = :providerStatus, o.lastCheckedAt = :now, o.failureCode = null
            where o.orderId = :orderId
            """)
    int markPaid(@Param("orderId") UUID orderId, @Param("paid") Long paid, @Param("providerStatus") String providerStatus,
            @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update PaymentOrderEntity o set o.paymentStatus = :status, o.observedPaidAmount = :paid,
                o.providerStatus = :providerStatus, o.lastCheckedAt = :now, o.failureCode = :failure
            where o.orderId = :orderId
            """)
    int progress(@Param("orderId") UUID orderId, @Param("status") String status, @Param("paid") Long observedPaid,
            @Param("providerStatus") String providerStatus, @Param("now") Instant now, @Param("failure") String failureCode);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update PaymentOrderEntity o set o.paymentStatus = case when o.paymentStatus = 'PAID' then 'PAID' else 'EXCEPTION' end,
                o.failureCode = :reason, o.lastCheckedAt = :now
            where o.orderId = :orderId
            """)
    int exception(@Param("orderId") UUID orderId, @Param("reason") String reason, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update PaymentOrderEntity o set o.paymentStatus = 'DEV_BYPASSED', o.developmentBypassedAt = :now, o.failureCode = null
            where o.orderId = :orderId
            """)
    int bypass(@Param("orderId") UUID orderId, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update PaymentOrderEntity o set o.failureCode = null where o.orderId = :orderId")
    int clearFailure(@Param("orderId") UUID orderId);

    /** Records a processing failure unless the order is already applied; a still-CREATING order becomes UNKNOWN. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update PaymentOrderEntity o set o.failureCode = :failure,
                o.paymentStatus = case when o.paymentStatus = 'CREATING' then 'UNKNOWN' else o.paymentStatus end
            where o.orderId = :orderId
              and not exists (select 1 from PaymentApplicationEntity a where a.orderId = o.orderId and a.state = 'APPLIED')
            """)
    int processingFailed(@Param("orderId") UUID orderId, @Param("failure") String failureCode);

    /** Orders that need a status check, oldest first (at most 20 per scheduling pass). */
    @Query("""
            select o.orderId from PaymentOrderEntity o join SubscriptionIntentEntity i on i.intentId = o.intentId
            where i.state in ('OPEN', 'WAITING_CAPACITY') and o.paymentStatus in ('PENDING', 'UNKNOWN', 'PARTIAL', 'PAID')
              and (o.lastCheckedAt is null or o.lastCheckedAt < :checkedBefore)
              and not exists (select 1 from ProcessingJobEntity j join OutboxEventEntity e on e.eventId = j.eventId
                  where e.aggregateId = o.orderId and j.handler in ('PAYMENT_CREATE', 'PAYMENT_RECONCILE', 'PAYMENT_APPLY')
                    and j.status in ('PENDING', 'RUNNING', 'RETRY', 'FAILED'))
            order by o.createdAt
            """)
    List<UUID> dueForCheck(@Param("checkedBefore") Instant checkedBefore, Pageable limit);

    record Confirmation(UUID orderId, Long providerOrderCode, String name, Long priceVnd, Integer durationMonths,
                        Integer employeeSeats, Instant paidAt, String kind, String email, String slug) {
        @Override public String toString() { return "PaymentConfirmation[redacted]"; }
    }

    @Query("""
            select new com.adaptlearngraph.repository.PaymentOrderJpaRepository$Confirmation(o.orderId, o.providerOrderCode, o.name,
                o.priceVnd, o.durationMonths, o.employeeSeats, o.paidAt, i.kind, a.identifier,
                (select w.slug from OrganizationWorkspaceEntity w where w.organizationId = a.organizationId))
            from PaymentOrderEntity o join SubscriptionIntentEntity i on i.intentId = o.intentId
            join AccountEntity a on a.accountId = o.createdBy where o.orderId = :orderId
            """)
    Optional<Confirmation> confirmation(@Param("orderId") UUID orderId);}
