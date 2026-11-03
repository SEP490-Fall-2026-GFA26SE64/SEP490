package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.PlatformCatalogTemplate.Edge;
import com.adaptlearngraph.repository.PlatformCatalogTemplate.Node;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Copies template nodes and relationships into one organization. Ids are derived from (organization, source id),
 * so retries are idempotent and two organizations copying the same template never share a node. Each copy is one
 * read-write {@code neo4jTransactionManager} transaction: per label one ownership check and one UNWIND MERGE, then one
 * UNWIND MERGE per (type, source label, target label) relationship group.
 */
public final class Neo4jWorkspaceCatalogWriter implements WorkspaceCatalogGraphWriter {
    private static final Set<String> LABELS = Set.of("Occupation", "TargetRole", "Level", "Competency", "MicroSkill", "LearningModule");
    private final java.util.function.Supplier<Neo4jCypher> graph;

    /** The graph is resolved lazily so the worker bean can be created before Neo4j is reachable. */
    public Neo4jWorkspaceCatalogWriter(java.util.function.Supplier<Neo4jCypher> graph) {
        this.graph = graph;
    }

    public static String copiedId(String organizationId, String sourceId) {
        return UUID.nameUUIDFromBytes(("catalog-copy:" + organizationId + ":" + sourceId).getBytes(StandardCharsets.UTF_8)).toString();
    }

    @Override
    public void copy(String organizationId, String templateVersion, Collection<Node> nodes, Collection<Edge> edges) {
        Neo4jTenantGuard.requireOrganization(organizationId);
        var ids = new HashMap<String, String>();
        var labels = new HashMap<String, String>();
        for (Node node : nodes) {
            if (!LABELS.contains(node.label())) throw new IllegalArgumentException("Unsupported template label");
            ids.put(node.id(), copiedId(organizationId, node.id()));
            labels.put(node.id(), node.label());
        }
        var nodeRows = new LinkedHashMap<String, List<Map<String, Object>>>();
        for (Node node : nodes) {
            var properties = new LinkedHashMap<String, Object>();
            node.properties().forEach((key, value) -> {
                if (value != null) properties.put(key, value instanceof String text && ids.containsKey(text) ? ids.get(text) : value);
            });
            properties.put("id", ids.get(node.id()));
            properties.put("organizationId", organizationId);
            properties.put("sourceId", node.id());
            properties.put("sourceTemplateVersion", templateVersion);
            nodeRows.computeIfAbsent(node.label(), label -> new ArrayList<>()).add(Map.of("id", ids.get(node.id()), "props", properties));
        }
        var edgeRows = new LinkedHashMap<String, List<Map<String, Object>>>();
        for (Edge edge : edges) {
            if (!edge.type().matches("[A-Z_]+") || !ids.containsKey(edge.fromId()) || !ids.containsKey(edge.toId())) continue;
            var properties = new LinkedHashMap<String, Object>();
            edge.properties().forEach((key, value) -> { if (value != null) properties.put(key, value); });
            String sourceId = edge.id() != null ? edge.id() : edge.type() + ":" + edge.fromId() + ":" + edge.toId();
            properties.put("id", copiedId(organizationId, sourceId));
            properties.put("organizationId", organizationId);
            properties.put("sourceId", sourceId);
            String key = edge.type() + "|" + labels.get(edge.fromId()) + "|" + labels.get(edge.toId());
            edgeRows.computeIfAbsent(key, k -> new ArrayList<>()).add(Map.of(
                    "from", ids.get(edge.fromId()), "to", ids.get(edge.toId()), "id", properties.get("id"), "props", properties));
        }
        // Neo4jClient: labels/types are interpolated (Cypher cannot parameterize them) only after the allow-list and
        // [A-Z_]+ checks above; batched ownership checks and UNWIND MERGE batches are not derivable repository queries.
        graph.get().write(tx -> {
            for (var group : nodeRows.entrySet()) {
                var rowIds = group.getValue().stream().map(row -> row.get("id")).toList();
                boolean foreign = tx.single("UNWIND $ids AS id MATCH (n:" + group.getKey() + " {id: id}) "
                                + "WHERE coalesce(n.organizationId, '') <> $organization RETURN count(n) > 0 AS foreign",
                        Map.of("ids", rowIds, "organization", organizationId)).get("foreign").asBoolean();
                if (foreign) throw new com.adaptlearngraph.exception.CrossTenantWriteException();
                tx.execute("UNWIND $rows AS row MERGE (n:" + group.getKey() + " {id: row.id}) SET n = row.props",
                        Map.of("rows", group.getValue()));
            }
            for (var group : edgeRows.entrySet()) {
                String[] parts = group.getKey().split("\\|");
                tx.execute("UNWIND $rows AS row MATCH (a:" + parts[1] + " {id: row.from}) MATCH (b:" + parts[2] + " {id: row.to}) "
                                + "WHERE a.organizationId = $organization AND b.organizationId = $organization "
                                + "MERGE (a)-[r:" + parts[0] + " {id: row.id}]->(b) SET r = row.props",
                        Map.of("rows", group.getValue(), "organization", organizationId));
            }
            return null;
        });
    }
}
