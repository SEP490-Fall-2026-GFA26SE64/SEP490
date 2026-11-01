package com.adaptlearngraph.assessment.bank.infrastructure;

import com.adaptlearngraph.assessment.bank.domain.QuestionBank.Choice;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.Failure;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.SessionConfig;
import org.neo4j.driver.TransactionConfig;
import org.neo4j.driver.async.AsyncSession;

/** Bounds remote catalog waits even when a disconnected Bolt result never completes. */
public final class Neo4jQuestionBankSkillReader {
    private final Driver driver;
    private final String database;
    private final Duration timeout;

    public Neo4jQuestionBankSkillReader(Driver driver, String database, Duration timeout) {
        if (timeout.isZero() || timeout.isNegative() || timeout.compareTo(Duration.ofSeconds(30)) > 0)
            throw new IllegalArgumentException("Question Bank catalog timeout must be positive and at most 30 seconds");
        this.driver = driver;
        this.database = database;
        this.timeout = timeout;
    }

    public List<Choice> skills() {
        return read("MATCH (s:MicroSkill) WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED' RETURN DISTINCT s.id AS id,s.name AS name ORDER BY name,id",
                Map.of(), row -> new Choice(row.get("id").asString(), row.get("name").asString()));
    }

    public String requireSkill(String id) {
        var names = read("MATCH (s:MicroSkill {id:$id}) WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED' RETURN s.name AS name",
                Map.of("id", id), row -> row.get("name").asString());
        if (names.size() != 1) throw new Failure(400, "Select a currently active approved MicroSkill");
        return names.getFirst();
    }

    private <T> List<T> read(String query, Map<String, Object> parameters, Function<Record, T> mapper) {
        AsyncSession session = null;
        CompletableFuture<List<T>> result = null;
        try {
            session = driver.asyncSession(SessionConfig.forDatabase(database));
            result = session.executeReadAsync(tx -> tx.runAsync(query, parameters)
                    .thenCompose(cursor -> cursor.listAsync(mapper)),
                    TransactionConfig.builder().withTimeout(timeout).build()).toCompletableFuture();
            return result.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException interrupted) {
            if (result != null) result.cancel(true);
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (TimeoutException timedOut) {
            if (result != null) result.cancel(true);
            throw unavailable();
        } catch (ExecutionException | RuntimeException failed) {
            throw unavailable();
        } finally {
            if (session != null) {
                // Cleanup must not prolong a PostgreSQL transaction after the client deadline.
                try { session.closeAsync().exceptionally(failed -> null); }
                catch (RuntimeException disconnected) { /* Driver connection is already unusable. */ }
            }
        }
    }

    private Failure unavailable() { return new Failure(503, "MicroSkill catalog is unavailable. Retry later."); }
}
