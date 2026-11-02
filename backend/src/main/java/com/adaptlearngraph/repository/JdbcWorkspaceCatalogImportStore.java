package com.adaptlearngraph.repository;

import java.sql.Array;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

public final class JdbcWorkspaceCatalogImportStore implements WorkspaceCatalogImportStore {
    private static final Duration LEASE = Duration.ofMinutes(5);
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public JdbcWorkspaceCatalogImportStore(JdbcTemplate jdbc, TransactionTemplate transactions) {
        this.jdbc = jdbc;
        this.transactions = transactions;
    }

    @Override
    public Optional<Job> claim(Instant now) {
        return transactions.execute(status -> {
            var jobs = jdbc.query("""
                    SELECT c.organization_id, c.registration_id, c.attempts, s.selected_node_ids
                    FROM platform.workspace_catalog_import c
                    JOIN platform.registration_catalog_selection s USING (registration_id)
                    WHERE c.state = 'PENDING' AND c.next_attempt_at <= ? AND (c.lease_until IS NULL OR c.lease_until < ?)
                    ORDER BY c.created_at LIMIT 1 FOR UPDATE OF c SKIP LOCKED
                    """, (rs, i) -> new Job(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), UUID.randomUUID(),
                    rs.getInt(3) + 1, ids(rs.getArray(4))), time(now), time(now));
            if (jobs.isEmpty()) return Optional.<Job>empty();
            var job = jobs.getFirst();
            jdbc.update("""
                    UPDATE platform.workspace_catalog_import
                    SET attempts = attempts + 1, lease_owner = ?, lease_until = ?, updated_at = ?
                    WHERE organization_id = ?
                    """, job.lease(), time(now.plus(LEASE)), time(now), job.organizationId());
            return Optional.of(job);
        });
    }

    @Override
    public void succeed(Job job, String templateVersion, String templateSha256, int nodes, int relationships, Instant now) {
        transactions.executeWithoutResult(status -> {
            int updated = jdbc.update("""
                    UPDATE platform.workspace_catalog_import
                    SET state = 'SUCCEEDED', template_version = ?, template_sha256 = ?, node_count = ?, relationship_count = ?,
                        failure_code = NULL, lease_owner = NULL, lease_until = NULL, completed_at = ?, updated_at = ?
                    WHERE organization_id = ? AND lease_owner = ? AND state = 'PENDING'
                    """, templateVersion, templateSha256, nodes, relationships, time(now), time(now), job.organizationId(), job.lease());
            if (updated != 1) return;
            jdbc.update("""
                    UPDATE platform.organization_workspace SET setup_state = 'READY', ready_at = coalesce(ready_at, ?), failure_code = NULL
                    WHERE organization_id = ? AND setup_state = 'PROVISIONING'
                      AND EXISTS (SELECT 1 FROM platform.subscription s JOIN platform.subscription_period p USING (subscription_id)
                                  WHERE s.organization_id = ?)
                    """, time(now), job.organizationId(), job.organizationId());
        });
    }

    @Override
    public void retry(Job job, String failureCode, Instant nextAttempt, Instant now) {
        jdbc.update("""
                UPDATE platform.workspace_catalog_import
                SET failure_code = ?, next_attempt_at = ?, lease_owner = NULL, lease_until = NULL, updated_at = ?
                WHERE organization_id = ? AND lease_owner = ? AND state = 'PENDING'
                """, failureCode, time(nextAttempt), time(now), job.organizationId(), job.lease());
    }

    @Override
    public void fail(Job job, String failureCode, Instant now) {
        transactions.executeWithoutResult(status -> {
            int updated = jdbc.update("""
                    UPDATE platform.workspace_catalog_import
                    SET state = 'FAILED', failure_code = ?, lease_owner = NULL, lease_until = NULL, updated_at = ?
                    WHERE organization_id = ? AND lease_owner = ? AND state = 'PENDING'
                    """, failureCode, time(now), job.organizationId(), job.lease());
            if (updated != 1) return;
            jdbc.update("""
                    UPDATE platform.organization_workspace SET setup_state = 'FAILED', failure_code = 'CATALOG_IMPORT_FAILED'
                    WHERE organization_id = ? AND setup_state = 'PROVISIONING'
                    """, job.organizationId());
        });
    }

    private static List<String> ids(Array array) throws java.sql.SQLException {
        return Arrays.stream((Object[]) array.getArray()).map(Object::toString).toList();
    }

    private static Timestamp time(Instant instant) {
        return Timestamp.from(instant);
    }
}
