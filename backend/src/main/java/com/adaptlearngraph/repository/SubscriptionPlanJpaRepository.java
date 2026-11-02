package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.SubscriptionPlanEntity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Global subscription plans; versions are immutable and appended, the plan points at its current version. */
public interface SubscriptionPlanJpaRepository extends Repository<SubscriptionPlanEntity, UUID> {
    String CURRENT = """
            select new com.adaptlearngraph.repository.SubscriptionPlanJpaRepository$Current(p.planId, p.code, v.versionId,
                v.revision, v.name, v.description, v.priceVnd, v.currency, v.durationMonths, v.employeeSeats, v.createdAt,
                v.createdBy)
            from SubscriptionPlanEntity p join SubscriptionPlanVersionEntity v on v.versionId = p.currentVersionId
            """;

    record Current(UUID planId, String code, UUID versionId, Long revision, String name, String description, Long priceVnd,
                   String currency, Integer durationMonths, Integer employeeSeats, Instant createdAt, UUID createdBy) {}

    @Query(CURRENT + "order by v.employeeSeats, p.code")
    List<Current> currentPlans();

    @Query(CURRENT + "where p.planId = :planId")
    Optional<Current> current(@Param("planId") UUID planId);

    @Query(value = "SELECT plan_id FROM platform.subscription_plan WHERE plan_id = :planId FOR UPDATE", nativeQuery = true)
    Optional<UUID> lock(@Param("planId") UUID planId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("update SubscriptionPlanEntity p set p.currentVersionId = :versionId where p.planId = :planId")
    int point(@Param("planId") UUID planId, @Param("versionId") UUID versionId);
}
