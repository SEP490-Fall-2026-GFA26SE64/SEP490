package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.SelectionTransactionPort;
import java.util.Objects;
import java.util.function.Supplier;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Runs F02 command work in the PostgreSQL transaction managed by Spring. */
public final class TransactionTemplateSelectionTransactionAdapter implements SelectionTransactionPort {
    private final TransactionTemplate transactions;

    TransactionTemplateSelectionTransactionAdapter(PlatformTransactionManager transactionManager) {
        Objects.requireNonNull(transactionManager, "transactionManager must not be null");
        transactions = new TransactionTemplate(transactionManager);
        transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);
    }

    @Override
    public <T> T required(Supplier<T> work) {
        Objects.requireNonNull(work, "work must not be null");
        return transactions.execute(status -> work.get());
    }
}
