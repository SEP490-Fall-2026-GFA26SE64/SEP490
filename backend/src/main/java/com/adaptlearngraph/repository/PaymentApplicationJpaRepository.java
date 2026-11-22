package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.PaymentApplicationEntity;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface PaymentApplicationJpaRepository extends Repository<PaymentApplicationEntity, UUID> {
    /** One application row per intent ({@code ON CONFLICT (intent_id) DO UPDATE}); an applied row names a period or a seat add-on. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.payment_application(application_id, order_id, intent_id, state, period_id, seat_addon_id,
              applied_at, failure_code, updated_at)
            VALUES (:id, :orderId, :intentId, :state, :periodId, :seatAddonId, :appliedAt, :failure, :now)
            ON CONFLICT (intent_id) DO UPDATE SET state = excluded.state, period_id = excluded.period_id,
              seat_addon_id = excluded.seat_addon_id, applied_at = excluded.applied_at, failure_code = excluded.failure_code,
              updated_at = excluded.updated_at
            """, nativeQuery = true)
    int upsert(@Param("id") UUID id, @Param("orderId") UUID orderId, @Param("intentId") UUID intentId,
            @Param("state") String state, @Param("periodId") UUID periodId, @Param("seatAddonId") UUID seatAddonId,
            @Param("appliedAt") Instant appliedAt, @Param("failure") String failureCode, @Param("now") Instant now);
}
