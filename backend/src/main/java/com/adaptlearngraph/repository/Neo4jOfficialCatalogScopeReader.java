package com.adaptlearngraph.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.neo4j.driver.Value;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Read-only snapshot of the catalog nodes named by an official Question Bank scope and the relationships around them, read
 * in one read transaction from the configured database. Comparison against the pinned scope stays in the helper.
 */
public final class Neo4jOfficialCatalogScopeReader {
    // Neo4jClient: label-agnostic lookup returning labels and raw property maps (no single @Node type applies).
    private static final String NODES = """
            MATCH (n) WHERE n.id IN $ids
            RETURN n.id AS id, labels(n) AS labels, properties(n) AS props
            """;
    // Neo4jClient: outgoing membership + incoming ownership/teaching of any relationship type, with raw properties.
    private static final String EDGES = """
            MATCH (a)-[r]->(b)
            WHERE r.status='ACTIVE' AND (
              (a.id IN $ids AND type(r) IN ['HAS_ROLE','HAS_LEVEL','HAS_COMPETENCY','HAS_SKILL','REQUIRES_SKILL'])
              OR (b.id IN $ids AND type(r) IN ['HAS_ROLE','HAS_LEVEL','HAS_COMPETENCY','TEACHES']))
            RETURN type(r) AS type, a.id AS source, b.id AS target, properties(r) AS props
            """;

    public record GraphNode(String id, List<String> labels, Map<String, Object> properties) {}
    public record GraphEdge(String type, String source, String target, Map<String, Object> properties) {}
    public record Snapshot(List<GraphNode> nodes, List<GraphEdge> edges) {}

    private final Neo4jClient client;
    private final TransactionTemplate reads;
    private final String database;

    /** A blank {@code database} reads the default database, exactly like the driver session it replaces. */
    public Neo4jOfficialCatalogScopeReader(Neo4jClient client, PlatformTransactionManager transactions, String database) {
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
        this.database = database != null && !database.isBlank() ? database : null;
    }

    public Snapshot read(List<String> ids) {
        Map<String, Object> parameters = Map.of("ids", List.copyOf(ids));
        return reads.execute(status -> {
            List<GraphNode> nodes = new ArrayList<>(query(NODES).bindAll(parameters).fetchAs(GraphNode.class)
                    .mappedBy((types, row) -> new GraphNode(row.get("id").asString(), row.get("labels").asList(Value::asString),
                            row.get("props").asMap())).all());
            List<GraphEdge> edges = new ArrayList<>(query(EDGES).bindAll(parameters).fetchAs(GraphEdge.class)
                    .mappedBy((types, row) -> new GraphEdge(row.get("type").asString(), row.get("source").asString(),
                            row.get("target").asString(), row.get("props").asMap())).all());
            return new Snapshot(nodes, edges);
        });
    }

    private Neo4jClient.RunnableSpec query(String cypher) {
        var spec = client.query(cypher);
        return database == null ? spec : spec.in(database);
    }
}