package com.adaptlearngraph.repository;

import java.util.Objects;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Transaction templates over the {@code neo4jTransactionManager} for catalog adapters that are plain (non-proxied) beans.
 * Read-only templates route to readers exactly like the driver's {@code AccessMode.READ}.
 */
final class Neo4jCatalogTransactions {
    private Neo4jCatalogTransactions() {
    }

    static TransactionTemplate readOnly(PlatformTransactionManager transactions) {
        var template = new TransactionTemplate(Objects.requireNonNull(transactions, "Neo4j transaction manager cannot be null"));
        template.setReadOnly(true);
        return template;
    }

    static TransactionTemplate readWrite(PlatformTransactionManager transactions) {
        return new TransactionTemplate(Objects.requireNonNull(transactions, "Neo4j transaction manager cannot be null"));
    }
}