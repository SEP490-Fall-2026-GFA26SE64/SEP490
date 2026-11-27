package com.adaptlearngraph.repository;

import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Values;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Deletes every organization except the retained seed tenants, plus all rows, graph nodes and private files that
 * belong to them. Postgres runs in one transaction with user triggers disabled (immutable/append-only guards) and
 * then removes rows whose foreign keys point at deleted parents until nothing changes.
 */
public class DemoResetStore {
    public record PostgresResult(int organizations, int accounts, int registrations, int rows, Set<String> remainingOrganizations) {}

    private static final String SCHEMA = "platform";
    private static final int MAX_ORPHAN_PASSES = 50;

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final Driver neo4j;
    private final MinioClient minio;
    private final String bucket;

    public DemoResetStore(JdbcTemplate jdbc, Driver neo4j, MinioClient minio, String bucket) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(new DataSourceTransactionManager(jdbc.getDataSource()));
        this.neo4j = neo4j;
        this.minio = minio;
        this.bucket = bucket;
    }

    public PostgresResult resetPostgres(Set<UUID> retainedOrganizations) {
        return transactions.execute(status -> {
            jdbc.execute("SET LOCAL session_replication_role = replica");
            String keep = retainedOrganizations.stream().map(UUID::toString).sorted().collect(java.util.stream.Collectors.joining(",", "{", "}"));
            int organizations = jdbc.update("DELETE FROM platform.organization WHERE organization_id::text <> ALL(?::text[])", keep);
            int accounts = jdbc.update("""
                    DELETE FROM platform.account a
                    WHERE ((a.organization_id IS NOT NULL AND a.organization_id::text <> ALL(?::text[]))
                       OR (a.organization_id IS NULL AND NOT EXISTS (SELECT 1 FROM platform.account_role r WHERE r.account_id = a.account_id)))
                      AND NOT EXISTS (SELECT 1 FROM platform.platform_administrator p WHERE p.account_id = a.account_id)
                    """, keep);
            int registrations = jdbc.update("""
                    DELETE FROM platform.organization_registration g
                    WHERE NOT EXISTS (SELECT 1 FROM platform.account a WHERE a.account_id = g.account_id)
                    """);
            int rows = 0;
            for (String table : jdbc.queryForList("""
                    SELECT c.table_name FROM information_schema.columns c
                    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
                    WHERE c.table_schema = ? AND c.column_name = 'organization_id' AND t.table_type = 'BASE TABLE'
                      AND c.table_name NOT IN ('organization', 'account')
                    ORDER BY c.table_name
                    """, String.class, SCHEMA)) {
                rows += jdbc.update("DELETE FROM " + qualified(table) + " WHERE organization_id IS NOT NULL AND organization_id::text <> ALL(?::text[])", keep);
            }
            for (String table : List.of("registration_session_attributes", "registration_session", "registration_rate_limit")) {
                if (tableExists(table)) rows += jdbc.update("DELETE FROM " + qualified(table));
            }
            rows += deleteOrphans();
            Set<String> remaining = new LinkedHashSet<>(jdbc.queryForList(
                    "SELECT organization_id::text FROM platform.organization ORDER BY 1", String.class));
            return new PostgresResult(organizations, accounts, registrations, rows, remaining);
        });
    }

    public int resetGraph(Set<String> remainingOrganizations) {
        if (neo4j == null) return 0;
        try (var session = neo4j.session()) {
            return session.executeWrite(tx -> tx.run("""
                    MATCH (n) WHERE n.organizationId IS NOT NULL AND NOT n.organizationId IN $keep
                    DETACH DELETE n RETURN count(*) AS deleted
                    """, Values.parameters("keep", List.copyOf(remainingOrganizations))).single().get("deleted").asInt());
        }
    }

    public int resetFiles(Set<String> remainingOrganizations) throws Exception {
        if (minio == null || !minio.bucketExists(io.minio.BucketExistsArgs.builder().bucket(bucket).build())) return 0;
        List<String> doomed = new ArrayList<>();
        for (var item : minio.listObjects(ListObjectsArgs.builder().bucket(bucket).recursive(true).build())) {
            String name = item.get().objectName();
            int slash = name.indexOf('/');
            String owner = slash < 0 ? "" : name.substring(0, slash);
            if (isUuid(owner) && !remainingOrganizations.contains(owner)) doomed.add(name);
        }
        for (String name : doomed) minio.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(name).build());
        return doomed.size();
    }

    /** Deletes child rows whose complete foreign key no longer matches a parent row, repeating until stable. */
    private int deleteOrphans() {
        List<Map<String, Object>> keys = jdbc.queryForList("""
                SELECT child.relname AS child, parent.relname AS parent,
                       array_to_string(ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(n, i)
                           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i), ',') AS child_columns,
                       array_to_string(ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY k(n, i)
                           JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.n ORDER BY k.i), ',') AS parent_columns
                FROM pg_constraint c
                JOIN pg_class child ON child.oid = c.conrelid JOIN pg_namespace cn ON cn.oid = child.relnamespace
                JOIN pg_class parent ON parent.oid = c.confrelid JOIN pg_namespace pn ON pn.oid = parent.relnamespace
                WHERE c.contype = 'f' AND cn.nspname = ? AND pn.nspname = ?
                """, SCHEMA, SCHEMA);
        int total = 0;
        for (int pass = 0; pass < MAX_ORPHAN_PASSES; pass++) {
            int deleted = 0;
            for (Map<String, Object> key : keys) {
                String[] childColumns = key.get("child_columns").toString().split(",");
                String[] parentColumns = key.get("parent_columns").toString().split(",");
                StringBuilder notNull = new StringBuilder();
                StringBuilder match = new StringBuilder();
                for (int i = 0; i < childColumns.length; i++) {
                    if (i > 0) { notNull.append(" AND "); match.append(" AND "); }
                    notNull.append("c.").append(identifier(childColumns[i])).append(" IS NOT NULL");
                    match.append("p.").append(identifier(parentColumns[i])).append(" = c.").append(identifier(childColumns[i]));
                }
                deleted += jdbc.update("DELETE FROM " + qualified(key.get("child").toString()) + " c WHERE " + notNull
                        + " AND NOT EXISTS (SELECT 1 FROM " + qualified(key.get("parent").toString()) + " p WHERE " + match + ")");
            }
            total += deleted;
            if (deleted == 0) return total;
        }
        throw new IllegalStateException("Orphan cleanup did not converge");
    }

    private boolean tableExists(String table) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass(?) IS NOT NULL", Boolean.class, SCHEMA + "." + table));
    }

    private static String qualified(String table) {
        return identifier(SCHEMA) + "." + identifier(table);
    }

    private static String identifier(String name) {
        return "\"" + name.replace("\"", "\"\"") + "\"";
    }

    private static boolean isUuid(String value) {
        try {
            return UUID.fromString(value).toString().equals(value);
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }
}
