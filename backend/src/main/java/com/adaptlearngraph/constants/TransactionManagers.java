package com.adaptlearngraph.constants;

/** Bean names of the two transaction managers; always name one explicitly in {@code @Transactional}. */
public final class TransactionManagers {
    /** Hibernate/JPA manager for PostgreSQL. JdbcTemplate code on the same DataSource joins its transactions. */
    public static final String JPA = "transactionManager";
    /** Spring Data Neo4j manager for the knowledge graph. */
    public static final String NEO4J = "neo4jTransactionManager";

    private TransactionManagers() {
    }
}
