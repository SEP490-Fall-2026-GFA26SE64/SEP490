package com.adaptlearngraph.entities;

/**
 * Column definitions for PostgreSQL domains. JDBC reports domain columns as {@code Types.DISTINCT} with the qualified
 * domain name, so Hibernate's {@code ddl-auto=validate} only accepts them when the definition names the same domain.
 * They are never used to generate DDL; Flyway owns the schema.
 */
public final class PostgresColumnTypes {
    /** {@code platform.content_hash}: 64 lowercase hex characters (CHECK enforced by the domain). */
    public static final String CONTENT_HASH = "\"platform\".\"content_hash\"";

    private PostgresColumnTypes() {
    }
}
