package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.OrganizationKnowledgeGraph;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.neo4j.driver.Value;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;

/** Neo4jClient read of every ACTIVE catalog node and relationship of one organization, in one read transaction. */
public final class Neo4jOrganizationKnowledgeGraphReader implements OrganizationKnowledgeGraphReader {
    // Neo4jClient: label-agnostic projection over the seven catalog labels; missing status follows the legacy ACTIVE default.
    private static final String NODES = """
            MATCH (n)
            WHERE (n:JobPosition OR n:TargetRole OR n:Level OR n:Competency OR n:MicroSkill OR n:LearningModule OR n:Certificate)
              AND n.organizationId = $organizationId AND n.id IS NOT NULL
            WITH n, [label IN $labels WHERE label IN labels(n)][0] AS label, coalesce(n.status, 'ACTIVE') AS status
            WHERE status = 'ACTIVE' OR (label = 'TargetRole' AND status = 'PUBLISHED')
            RETURN n.id AS id, label, coalesce(n.name, n.title, n.code, n.id) AS name, n.code AS code,
                   n.description AS description, status, n.reviewStatus AS reviewStatus
            ORDER BY label, name
            """;
    // Neo4jClient: typed relationships between same-organization endpoints; superseded/archived links are excluded.
    private static final String EDGES = """
            MATCH (a)-[r]->(b)
            WHERE (a:JobPosition OR a:TargetRole OR a:Level OR a:Competency OR a:MicroSkill OR a:LearningModule)
              AND a.organizationId = $organizationId AND b.organizationId = $organizationId
              AND type(r) IN $types AND coalesce(r.status, 'ACTIVE') = 'ACTIVE'
              AND (r.organizationId IS NULL OR r.organizationId = $organizationId)
            RETURN DISTINCT type(r) AS type, a.id AS source, b.id AS target
            """;

    private final Neo4jClient client;
    private final TransactionOperations reads;

    public Neo4jOrganizationKnowledgeGraphReader(Neo4jClient client, PlatformTransactionManager transactions) {
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
    }

    @Override
    public OrganizationKnowledgeGraph read(String organizationId) {
        Map<String, Object> parameters = Map.of("organizationId", organizationId,
                "labels", OrganizationKnowledgeGraph.LABELS, "types", OrganizationKnowledgeGraph.RELATIONSHIPS);
        return reads.execute(transaction -> {
            List<OrganizationKnowledgeGraph.Node> nodes = new ArrayList<>(client.query(NODES).bindAll(parameters)
                    .fetchAs(OrganizationKnowledgeGraph.Node.class)
                    .mappedBy((types, row) -> new OrganizationKnowledgeGraph.Node(text(row.get("id")), text(row.get("label")),
                            text(row.get("name")), text(row.get("code")), text(row.get("description")),
                            text(row.get("status")), text(row.get("reviewStatus")))).all());
            List<OrganizationKnowledgeGraph.Edge> edges = new ArrayList<>(client.query(EDGES).bindAll(parameters)
                    .fetchAs(OrganizationKnowledgeGraph.Edge.class)
                    .mappedBy((types, row) -> {
                        String type = row.get("type").asString(), source = text(row.get("source")), target = text(row.get("target"));
                        return new OrganizationKnowledgeGraph.Edge(type + ":" + source + ":" + target, source, target, type);
                    }).all());
            return new OrganizationKnowledgeGraph(nodes, edges);
        });
    }

    private static String text(Value value) {
        if (value == null || value.isNull()) return null;
        return "STRING".equals(value.type().name()) ? value.asString() : value.toString();
    }
}
