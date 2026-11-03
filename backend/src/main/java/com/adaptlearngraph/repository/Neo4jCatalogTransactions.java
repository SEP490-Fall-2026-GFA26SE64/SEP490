package com.adaptlearngraph.repository;

import java.util.Objects;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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

    /**
     * Reads that behave like the former {@code session.run(...)} catalog reads: outside any transaction the callback runs
     * without transaction synchronization, so each {@code Neo4jClient} statement uses its own auto-commit session (one
     * RUN/PULL round trip instead of BEGIN, RUN/PULL and COMMIT). Inside an active transaction it joins as a read-only
     * transaction, as before.
     */
    static TransactionOperations autoCommitReads(PlatformTransactionManager transactions) {
        var joining = readOnly(transactions);
        return new TransactionOperations() {
            @Override
            public <T> T execute(TransactionCallback<T> action) {
                if (TransactionSynchronizationManager.isSynchronizationActive()) return joining.execute(action);
                return action.doInTransaction(new SimpleTransactionStatus(false));
            }
        };
    }
    static TransactionTemplate readWrite(PlatformTransactionManager transactions) {
        return new TransactionTemplate(Objects.requireNonNull(transactions, "Neo4j transaction manager cannot be null"));
    }
}