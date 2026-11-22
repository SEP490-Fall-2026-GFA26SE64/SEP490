package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.SubscriptionEntity;
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

/** Organization subscriptions and their immutable paid periods; every query is scoped by organization or subscription. */
public interface SubscriptionJpaRepository extends Repository<SubscriptionEntity, UUID>, InsertOnlyRepository<SubscriptionEntity> {
    record Period(Instant startsAt, Instant endsAt, Integer anniversaryDay) {}

    /** Order terms are totals; {@code orderAddonSeats}/{@code orderAddonAmountVnd} are their add-on part, {@code extraSeats} later add-ons. */
    record PaidPeriodRow(UUID periodId, Instant startsAt, Instant endsAt, String name, String description, Long priceVnd,
                         String currency, Integer durationMonths, Integer employeeSeats, UUID planId, UUID planVersionId,
                         Integer orderAddonSeats, Long orderAddonAmountVnd, Long extraSeats) {}

    String PAID_PERIOD = """
            select new com.adaptlearngraph.repository.SubscriptionJpaRepository$PaidPeriodRow(p.periodId, p.startsAt, p.endsAt,
                o.name, o.description, o.priceVnd, o.currency, o.durationMonths, o.employeeSeats, o.planId, o.planVersionId,
                o.addonSeats, o.addonAmountVnd,
                coalesce((select sum(a.seats) from SubscriptionSeatAddonEntity a where a.periodId = p.periodId), 0L))
            from SubscriptionEntity s join SubscriptionPeriodEntity p on p.subscriptionId = s.subscriptionId
            join PaymentOrderEntity o on o.orderId = p.orderId
            """;

    @Query("select s.subscriptionId from SubscriptionEntity s where s.organizationId = :organization")
    Optional<UUID> subscriptionOf(@Param("organization") UUID organizationId);

    @Query(value = "SELECT subscription_id FROM platform.subscription WHERE organization_id = :organization FOR UPDATE",
            nativeQuery = true)
    List<UUID> lockOfOrganization(@Param("organization") UUID organizationId);

    @Query("""
            select count(p) > 0 from SubscriptionEntity s join SubscriptionPeriodEntity p on p.subscriptionId = s.subscriptionId
            where s.organizationId = :organization and p.startsAt <= :now and p.endsAt > :now
            """)
    boolean paidAt(@Param("organization") UUID organizationId, @Param("now") Instant now);

    @Query("select count(p) from SubscriptionPeriodEntity p where p.subscriptionId = :subscription and p.startsAt > :now")
    long futurePeriods(@Param("subscription") UUID subscriptionId, @Param("now") Instant now);

    @Query("""
            select new com.adaptlearngraph.repository.SubscriptionJpaRepository$Period(p.startsAt, p.endsAt, p.anniversaryDay)
            from SubscriptionPeriodEntity p where p.subscriptionId = :subscription order by p.endsAt desc
            """)
    List<Period> latestPeriod(@Param("subscription") UUID subscriptionId, Pageable first);

    @Query(PAID_PERIOD + "where s.organizationId = :organization and p.endsAt > :now order by p.startsAt")
    List<PaidPeriodRow> openPeriods(@Param("organization") UUID organizationId, @Param("now") Instant now);

    @Query(PAID_PERIOD + "where s.organizationId = :organization order by p.endsAt desc")
    List<PaidPeriodRow> latestPaidPeriod(@Param("organization") UUID organizationId, Pageable first);

    @Query(PAID_PERIOD + "where s.subscriptionId = :subscription and p.periodId = :period")
    Optional<PaidPeriodRow> paidPeriod(@Param("subscription") UUID subscriptionId, @Param("period") UUID periodId);

    @Query("select s.desiredAddonSeats from SubscriptionEntity s where s.subscriptionId = :subscription")
    Optional<Integer> desiredAddonSeats(@Param("subscription") UUID subscriptionId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update SubscriptionEntity s set s.desiredAddonSeats = :seats where s.subscriptionId = :subscription")
    int updateDesiredAddonSeats(@Param("subscription") UUID subscriptionId, @Param("seats") int seats);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query(value = """
            INSERT INTO platform.subscription_seat_addon(addon_id, subscription_id, period_id, order_id, seats, applied_at)
            VALUES (:id, :subscription, :period, :orderId, :seats, :now)
            """, nativeQuery = true)
    int insertSeatAddon(@Param("id") UUID addonId, @Param("subscription") UUID subscriptionId, @Param("period") UUID periodId,
            @Param("orderId") UUID orderId, @Param("seats") int seats, @Param("now") Instant now);

    record DirectoryPeriod(UUID organizationId, String name, Instant startsAt, Instant endsAt) {}

    @Query("""
            select new com.adaptlearngraph.repository.SubscriptionJpaRepository$DirectoryPeriod(
                s.organizationId, o.name, p.startsAt, p.endsAt)
            from SubscriptionEntity s join SubscriptionPeriodEntity p on p.subscriptionId = s.subscriptionId
            join PaymentOrderEntity o on o.orderId = p.orderId
            where s.organizationId in :organizations
            order by s.organizationId, p.startsAt
            """)
    List<DirectoryPeriod> directoryPeriods(@Param("organizations") List<UUID> organizationIds);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update SubscriptionEntity s set s.revision = s.revision + 1 where s.subscriptionId = :subscription")
    int bumpRevision(@Param("subscription") UUID subscriptionId);
}
