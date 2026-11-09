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
                UNWIND ['FOUNDATION','INTERMEDIATE','ADVANCED'] AS level
                WITH s,level WHERE level IN coalesce(s.moduleOnlyKnowledgeLevels,[])+coalesce(s.certificateOnlyKnowledgeLevels,[])
                    OR s.provisionMode IN ['MODULE_ONLY','CERTIFICATE_ONLY']
                RETURN s.id AS skill,level ORDER BY skill,level LIMIT 10001
                """,Map.of("organization",organization(organizationId)),row->new com.adaptlearngraph.entities.domain.QuestionBank.KnowledgeChoice(row.get("skill").asString(),row.get("level").asString(),List.of()));
    }
    public String requireKnowledge(String organizationId,String skill,String level) {
        com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(level);
        var found=read("""
                MATCH (s:MicroSkill {id:$id,organizationId:$organization})
                WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED'
                RETURN properties(s) AS skill LIMIT 2
                """,Map.of("organization",organization(organizationId),"id",skill),row->row.get("skill"));
        if(found.size()!=1)throw new Failure(400,"Select an owned approved Skill");
        var s=found.getFirst();
        var modules=s.get("moduleOnlyKnowledgeLevels").isNull()?List.<String>of():s.get("moduleOnlyKnowledgeLevels").asList(v->v.asString());
        var certificates=s.get("certificateOnlyKnowledgeLevels").isNull()?List.<String>of():s.get("certificateOnlyKnowledgeLevels").asList(v->v.asString());
        var mode=com.adaptlearngraph.entities.domain.SkillProvisionMode.resolve(s.get("provisionMode").asString(null),modules,certificates,com.adaptlearngraph.entities.domain.KnowledgeLevel.valueOf(level));
        if(mode==null || s.get("version").asString("").isBlank())throw new Failure(400,"Configure this Skill and knowledge level before publishing");
        return s.get("version").asString();
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
