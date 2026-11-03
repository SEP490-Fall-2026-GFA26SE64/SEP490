package com.adaptlearngraph.repository;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import org.neo4j.driver.Record;
import org.neo4j.driver.exceptions.Neo4jException;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.Neo4jPersistenceExceptionTranslator;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Hand-written Cypher through {@link Neo4jClient}, one {@code neo4jTransactionManager} transaction per {@link #read} or
 * {@link #write} call (replacing the driver's managed read/write transactions). Used where no {@code @Node}
 * mapping applies: label-agnostic catalog snapshots, aggregate/projection rows that callers validate field by field,
 * and seed/bootstrap statements. Rows are the driver's materialized {@link Record}s.
 */
public final class Neo4jCypher {
    /** Statements that join the surrounding Spring-managed Neo4j transaction. */
    public interface Statements {
        List<Record> list(String cypher, Map<String, ?> parameters);

        default List<Record> list(String cypher) {
            return list(cypher, Map.of());
        }

        /** Exactly one row, like the driver's {@code Result.single()}. */
        default Record single(String cypher, Map<String, ?> parameters) {
            var rows = list(cypher, parameters);
            if (rows.size() != 1) throw new IllegalStateException("Expected exactly one Cypher row but found " + rows.size());
            return rows.getFirst();
        }

        default Record single(String cypher) {
            return single(cypher, Map.of());
        }

        /** Runs a statement and discards its rows, like the driver's {@code run(...).consume()}. */
        void execute(String cypher, Map<String, ?> parameters);
    }

    private static final Neo4jPersistenceExceptionTranslator TRANSLATOR = new Neo4jPersistenceExceptionTranslator();
    private final Neo4jClient client;
    private final TransactionTemplate reads;
    private final TransactionTemplate writes;
    private final Statements statements;

    public Neo4jCypher(Neo4jClient client, PlatformTransactionManager transactions) {
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
        this.statements = new Statements() {
            @Override
            public List<Record> list(String cypher, Map<String, ?> parameters) {
                return List.copyOf(query(cypher, parameters).fetchAs(Record.class).mappedBy((types, row) -> row).all());
            }

            @Override
            public void execute(String cypher, Map<String, ?> parameters) {
                query(cypher, parameters).run();
            }
        };
    }

    /** Read-only transaction (routed like {@code AccessMode.READ}); exceptions thrown by {@code work} propagate unchanged. */
    public <T> T read(Function<Statements, T> work) {
        return run(reads, work);
    }

    /** Read-write transaction committed when {@code work} returns and rolled back when it throws. */
    public <T> T write(Function<Statements, T> work) {
        return run(writes, work);
    }

    /** Driver failures surfacing from commit are translated like statement failures, so no driver exception escapes. */
    private <T> T run(TransactionTemplate template, Function<Statements, T> work) {
        try {
            return template.execute(status -> work.apply(statements));
        } catch (Neo4jException failure) {
            RuntimeException translated = TRANSLATOR.translateExceptionIfPossible(failure);
            throw translated != null ? translated : failure;
        }
    }

    /**
     * One auto-commit statement outside any Spring-managed transaction (Neo4j forbids schema commands in a transaction
     * that also reads or writes data).
     */
    public void autoCommit(String cypher) {
        client.query(cypher).run();
    }

    @SuppressWarnings("unchecked")
    private Neo4jClient.RunnableSpec query(String cypher, Map<String, ?> parameters) {
        return client.query(cypher).bindAll((Map<String, Object>) parameters);
    }
}
