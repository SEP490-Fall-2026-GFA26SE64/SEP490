package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.AdaptiveBlueprintListing.*;
import com.adaptlearngraph.entities.AdaptiveBlueprint.VersionId;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** History/counts from one PostgreSQL snapshot. No Catalog/technical/learner locks or writes. */
public final class JpaAdaptiveBlueprintListing {
    private final AdaptiveBlueprintListingJpaRepository rows;
    private final TransactionTemplate reads;
    private final boolean workspaceNames;
    JpaAdaptiveBlueprintListing(AdaptiveBlueprintListingJpaRepository rows, PlatformTransactionManager manager) {
        this(rows,manager,false);
    }
    JpaAdaptiveBlueprintListing(AdaptiveBlueprintListingJpaRepository rows, PlatformTransactionManager manager, boolean workspaceNames) {
        this.rows = Objects.requireNonNull(rows);
        this.workspaceNames = workspaceNames;
        reads = new TransactionTemplate(manager);
        reads.setReadOnly(true);
        reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    Page list(UUID org, Set<String> grants, Query query) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("List owns its read snapshot");
        if (grants.isEmpty()) return new Page(List.of(), 0, query.page(), query.size());
        String status = query.status() == null ? null : query.status().name();
        long offset = (long) query.page() * query.size();
        boolean newest = query.direction() == Direction.NEWEST;
        return Objects.requireNonNull(reads.execute(transaction -> {
            long total = workspaceNames
                    ? rows.countByWorkspaceName(org, grants, query.search(), status, query.occupationId())
                    : rows.countBySnapshotName(org, grants, query.search(), status, query.occupationId());
            List<Object[]> found = workspaceNames
                    ? newest ? rows.newestByWorkspaceName(org, grants, query.search(), status, query.occupationId(), query.size(), offset)
                             : rows.oldestByWorkspaceName(org, grants, query.search(), status, query.occupationId(), query.size(), offset)
                    : newest ? rows.newestBySnapshotName(org, grants, query.search(), status, query.occupationId(), query.size(), offset)
                             : rows.oldestBySnapshotName(org, grants, query.search(), status, query.occupationId(), query.size(), offset);
            return new Page(found.stream().map(JpaAdaptiveBlueprintListing::row).toList(), total, query.page(), query.size());
        }));
    }

    private static Row row(Object[] value) {
        UUID blueprint = (UUID) value[0];
        Integer current = value[13] == null ? null : ((Number) value[13]).intValue();
        return new Row(blueprint, (UUID) value[1], value[2] == null ? null : ((Number) value[2]).intValue(),
                (String) value[3], (String) value[4], (String) value[5],
                Type.valueOf((String) value[6]), Status.valueOf((String) value[7]), (String) value[8],
                AdaptiveAttemptRows.instant(value[9]), ((Number) value[10]).longValue(), Boolean.TRUE.equals(value[11]),
                value[12] == null ? 0L : ((Number) value[12]).longValue(), current == null ? null : new VersionId(blueprint, current));
    }
}
