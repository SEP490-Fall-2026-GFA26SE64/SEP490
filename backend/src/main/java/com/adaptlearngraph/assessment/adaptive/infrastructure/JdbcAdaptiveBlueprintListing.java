package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintListing.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionId;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** History/counts from one PostgreSQL snapshot. No Catalog/technical/learner locks or writes. */
final class JdbcAdaptiveBlueprintListing {
    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate reads;
    JdbcAdaptiveBlueprintListing(NamedParameterJdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        reads = new TransactionTemplate(manager);
        reads.setReadOnly(true);
        reads.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
    }

    private static final String FILTERED = """
            WITH counts AS (
                SELECT blueprint_id,blueprint_version,count(*) AS active_count
                FROM platform.baseline_adaptive_attempt
                WHERE organization_id=:org AND occupation_id IN (:grants) AND state='IN_PROGRESS'
                GROUP BY blueprint_id,blueprint_version
            ), rows AS (
                SELECT w.blueprint_id,w.working_revision_id,NULL::integer AS version,w.configuration->>'name' AS name,
                    w.occupation_id,coalesce((SELECT v.occupation_name_snapshot
                        FROM platform.baseline_adaptive_blueprint_version v
                        WHERE v.organization_id=:org AND v.blueprint_id=w.blueprint_id
                        ORDER BY v.version DESC LIMIT 1),w.occupation_id) AS occupation_name,
                    'DRAFT' AS type,'DRAFT' AS status,'UPDATED' AS date_label,w.updated_at AS date,
                    0::bigint AS active_count,NOT jsonb_exists(w.configuration,'occupationBounds') AS update_required,
                    w.revision,a.blueprint_version AS current_version
                FROM platform.baseline_adaptive_blueprint_working_revision w
                LEFT JOIN platform.baseline_blueprint_activation a
                    ON a.organization_id=w.organization_id AND a.occupation_id=w.occupation_id AND a.blueprint_id=w.blueprint_id
                WHERE w.organization_id=:org AND w.occupation_id IN (:grants) AND w.state='OPEN'
                UNION ALL
                SELECT v.blueprint_id,NULL::uuid,v.version,v.name,v.occupation_id,v.occupation_name_snapshot,'VERSION',
                    CASE WHEN a.blueprint_version=v.version THEN 'ACTIVE'
                         WHEN coalesce(c.active_count,0)>0 THEN 'RETIRING' ELSE 'INACTIVE' END,
                    'ACTIVATED',v.created_at,coalesce(c.active_count,0),v.scope_policy IS NULL,
                    coalesce(a.activation_revision,0),a.blueprint_version
                FROM platform.baseline_adaptive_blueprint_version v
                LEFT JOIN platform.baseline_blueprint_activation a
                    ON a.organization_id=v.organization_id AND a.occupation_id=v.occupation_id AND a.blueprint_id=v.blueprint_id
                LEFT JOIN counts c ON c.blueprint_id=v.blueprint_id AND c.blueprint_version=v.version
                WHERE v.organization_id=:org AND v.occupation_id IN (:grants)
            ), filtered AS (
                SELECT * FROM rows WHERE strpos(lower(name),lower(:search))>0
                    AND (:status IS NULL OR status=:status) AND (:occupation IS NULL OR occupation_id=:occupation)
            )
            """;

    Page list(UUID org, Set<String> grants, Query query) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("List owns its read snapshot");
        if (grants.isEmpty()) return new Page(java.util.List.of(), 0, query.page(), query.size());
        var params = new MapSqlParameterSource("org", org).addValue("grants", grants).addValue("search", query.search())
                .addValue("status", query.status() == null ? null : query.status().name(), java.sql.Types.VARCHAR)
                .addValue("occupation", query.occupationId(), java.sql.Types.VARCHAR)
                .addValue("size", query.size()).addValue("offset", (long) query.page() * query.size());
        return Objects.requireNonNull(reads.execute(transaction -> {
            long total = Objects.requireNonNull(jdbc.queryForObject(FILTERED + "SELECT count(*) FROM filtered", params, Long.class));
            // Only this validated enum controls SQL syntax; all client values remain bound parameters.
            String direction = query.direction() == Direction.NEWEST ? "DESC" : "ASC";
            var rows = jdbc.query(FILTERED + "SELECT * FROM filtered ORDER BY date " + direction
                    + ",type,blueprint_id,working_revision_id,version LIMIT :size OFFSET :offset", params, (rs, n) -> {
                UUID blueprint = rs.getObject("blueprint_id", UUID.class);
                Integer current = rs.getObject("current_version", Integer.class);
                return new Row(blueprint, rs.getObject("working_revision_id", UUID.class), rs.getObject("version", Integer.class),
                        rs.getString("name"), rs.getString("occupation_id"), rs.getString("occupation_name"),
                        Type.valueOf(rs.getString("type")), Status.valueOf(rs.getString("status")), rs.getString("date_label"),
                        rs.getTimestamp("date").toInstant(), rs.getLong("active_count"), rs.getBoolean("update_required"),
                        rs.getLong("revision"), current == null ? null : new VersionId(blueprint, current));
            });
            return new Page(rows, total, query.page(), query.size());
        }));
    }
}
