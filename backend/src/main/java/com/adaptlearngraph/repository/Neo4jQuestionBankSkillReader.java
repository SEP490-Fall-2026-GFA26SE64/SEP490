package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.QuestionBank.Choice;
import com.adaptlearngraph.entities.domain.QuestionBank.Failure;
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

    public List<Choice> skills(String organizationId) {
        return read("MATCH (s:MicroSkill) WHERE s.organizationId=$organization AND s.status='ACTIVE' AND s.reviewStatus='APPROVED' RETURN DISTINCT s.id AS id,s.name AS name ORDER BY name,id",
                Map.of("organization", organization(organizationId)), row -> new Choice(row.get("id").asString(), row.get("name").asString()));
    }

    public String requireSkill(String organizationId, String id) {
        var names = read("MATCH (s:MicroSkill {id:$id}) WHERE s.organizationId=$organization AND s.status='ACTIVE' AND s.reviewStatus='APPROVED' RETURN s.name AS name",
                Map.of("id", id, "organization", organization(organizationId)), row -> row.get("name").asString());
        if (names.size() != 1) throw new Failure(400, "Select a currently active approved MicroSkill");
        return names.getFirst();
    }
    public List<com.adaptlearngraph.entities.domain.QuestionBank.KnowledgeChoice> knowledge(String organizationId) {
        return read("""
                MATCH (s:MicroSkill {organizationId:$organization}) WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED'
                UNWIND [{level:'FOUNDATION',codes:coalesce(s.foundationOutcomeCodes,[]),labels:coalesce(s.foundationOutcomeLabels,[])},
                    {level:'INTERMEDIATE',codes:coalesce(s.intermediateOutcomeCodes,[]),labels:coalesce(s.intermediateOutcomeLabels,[])},
                    {level:'ADVANCED',codes:coalesce(s.advancedOutcomeCodes,[]),labels:coalesce(s.advancedOutcomeLabels,[])}] AS k
                WITH s,k WHERE size(k.codes)>0
                RETURN s.id AS skill,k.level AS level,k.codes AS codes,k.labels AS labels ORDER BY skill,level LIMIT 10001
                """,Map.of("organization",organization(organizationId)),row->{
                    var codes=row.get("codes").asList(v->v.asString());var labels=row.get("labels").asList(v->v.asString());
                    var choices=new java.util.ArrayList<Choice>();
                    for(int i=0;i<codes.size();i++)choices.add(new Choice(codes.get(i),i<labels.size()?labels.get(i):codes.get(i)));
                    return new com.adaptlearngraph.entities.domain.QuestionBank.KnowledgeChoice(row.get("skill").asString(),row.get("level").asString(),choices);
                });
    }

    public void requireOutcome(String organizationId,String skill,String level,String outcome) {
        String property=switch(com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(level)) {
            case FOUNDATION -> "foundationOutcomeCodes";
            case INTERMEDIATE -> "intermediateOutcomeCodes";
            case ADVANCED -> "advancedOutcomeCodes";
        };
        var found=read("""
                MATCH (s:MicroSkill {id:$id})
                WHERE s.organizationId=$organization AND s.status='ACTIVE' AND s.reviewStatus='APPROVED'
                    AND $outcome IN coalesce(s[$property],[])
                RETURN s.id AS id
                """,Map.of("organization",organization(organizationId),"id",skill,"property",property,"outcome",outcome),
                row->row.get("id").asString());
        if(found.size()!=1)throw new Failure(400,"Select a configured outcome for this skill and knowledge level");
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

    private static String organization(String organizationId) {
        if (organizationId == null || organizationId.isBlank()) throw new Failure(403, "Organization staff required");
        return organizationId;
    }

    private Failure unavailable() { return new Failure(503, "MicroSkill catalog is unavailable. Retry later."); }
}
