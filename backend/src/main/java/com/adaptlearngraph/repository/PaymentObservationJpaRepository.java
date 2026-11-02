package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.PaymentObservationEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Immutable provider evidence; duplicates (same source, order code and payload digest) are ignored atomically. */
public interface PaymentObservationJpaRepository extends Repository<PaymentObservationEntity, UUID> {
    @Modifying(flushAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.payment_observation(observation_id, order_id, provider_order_code, provider_reference,
              payment_link_id, amount, currency, observed_status, payload_digest, source, received_at, provider_paid_at, disposition)
            VALUES (:id, :orderId, :code, :reference, :link, :amount, :currency, :status, :digest, :source, :receivedAt,
              :paidAt, :disposition)
            ON CONFLICT (source, provider_order_code, payload_digest) DO NOTHING
            """, nativeQuery = true)
    int insertIfNew(@Param("id") UUID id, @Param("orderId") UUID orderId, @Param("code") long providerOrderCode,
            @Param("reference") String reference, @Param("link") String paymentLinkId, @Param("amount") Long amount,
            @Param("currency") String currency, @Param("status") String status, @Param("digest") String payloadDigest,
            @Param("source") String source, @Param("receivedAt") Instant receivedAt, @Param("paidAt") Instant providerPaidAt,
            @Param("disposition") String disposition);

    @Query("""
            select count(o) > 0 from PaymentObservationEntity o
            where o.providerReference = :reference and o.orderId is not null and o.orderId <> :orderId
            """)
    boolean referenceUsedByAnotherOrder(@Param("reference") String reference, @Param("orderId") UUID orderId);
}
