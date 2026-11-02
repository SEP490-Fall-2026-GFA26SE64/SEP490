package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.SubscriptionIntentEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface SubscriptionIntentJpaRepository
        extends Repository<SubscriptionIntentEntity, UUID>, InsertOnlyRepository<SubscriptionIntentEntity> {
    record Open(UUID intentId, String state, UUID appliedOrderId) {}

    @Query(value = "SELECT intent_id FROM platform.subscription_intent WHERE registration_id = :registration FOR UPDATE",
            nativeQuery = true)
    List<UUID> lockOfRegistration(@Param("registration") UUID registrationId);

    @Query(value = """
            SELECT intent_id FROM platform.subscription_intent WHERE organization_id = :organization AND state <> 'APPLIED'
            FOR UPDATE
            """, nativeQuery = true)
    List<UUID> lockUnappliedOfOrganization(@Param("organization") UUID organizationId);

    @Query(value = "SELECT intent_id FROM platform.subscription_intent WHERE intent_id = :intent FOR UPDATE", nativeQuery = true)
    Optional<UUID> lock(@Param("intent") UUID intentId);

    @Query("""
            select new com.adaptlearngraph.repository.SubscriptionIntentJpaRepository$Open(i.intentId, i.state, i.appliedOrderId)
            from SubscriptionIntentEntity i where i.intentId = :intent
            """)
    Optional<Open> open(@Param("intent") UUID intentId);

    @Query("select i.state from SubscriptionIntentEntity i where i.intentId = :intent")
    Optional<String> state(@Param("intent") UUID intentId);

    @Query("select i.appliedOrderId from SubscriptionIntentEntity i where i.intentId = :intent")
    Optional<UUID> appliedOrder(@Param("intent") UUID intentId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update SubscriptionIntentEntity i set i.state = 'EXCEPTION', i.updatedAt = :now where i.intentId = :intent and i.state <> 'APPLIED'")
    int exception(@Param("intent") UUID intentId, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update SubscriptionIntentEntity i set i.state = 'WAITING_CAPACITY', i.updatedAt = :now where i.intentId = :intent")
    int waitForCapacity(@Param("intent") UUID intentId, @Param("now") Instant now);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update SubscriptionIntentEntity i set i.state = 'APPLIED', i.appliedOrderId = :order, i.updatedAt = :now where i.intentId = :intent")
    int applied(@Param("intent") UUID intentId, @Param("order") UUID orderId, @Param("now") Instant now);
}
