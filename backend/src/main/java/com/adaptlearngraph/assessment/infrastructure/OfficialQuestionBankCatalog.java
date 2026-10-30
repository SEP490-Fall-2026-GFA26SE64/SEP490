package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import org.neo4j.driver.AccessMode;
import org.neo4j.driver.Driver;
import org.neo4j.driver.SessionConfig;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

/** Exact read-only parity check; approval and tenant publication are not synthesized here. */
final class OfficialQuestionBankCatalog {
    record Node(String label, Map<String, Object> properties) {}
    record Edge(String type, String fromId, String toId, Map<String, Object> properties) {}
    record Scope(String sourceSha256, String occupationId, String catalogVersion, List<Node> nodes,
                 List<Edge> relationships) {
        Map<String, String> skills() {
            Map<String, String> result = new TreeMap<>();
            nodes.stream().filter(node -> node.label().equals("MicroSkill")).forEach(node ->
                    require(result.put((String) node.properties().get("id"), (String) node.properties().get("name")) == null,
                            "Duplicate skill identity"));
            return result;
        }
    }

    void verify(Driver driver, String database, Scope scope) {
        require(scope.nodes() != null && scope.relationships() != null, "Missing catalog scope");
        Set<String> ids = new HashSet<>();
        Set<String> edges = new HashSet<>();
        for (Node node : scope.nodes()) {
            require(Set.of("Occupation", "TargetRole", "Level", "Competency", "MicroSkill", "LearningModule")
                    .contains(node.label()), "Unknown catalog label");
            require(ids.add((String) node.properties().get("id")), "Duplicate scope node");
            activeVersion(node.properties(), scope.catalogVersion());
        }
        for (Edge edge : scope.relationships()) {
            require(Set.of("HAS_ROLE", "HAS_LEVEL", "HAS_COMPETENCY", "HAS_SKILL", "REQUIRES_SKILL", "TEACHES")
                    .contains(edge.type()) && ids.contains(edge.fromId()) && ids.contains(edge.toId()), "Invalid scope edge");
            require(edges.add((String) edge.properties().get("id")), "Duplicate scope relationship");
            activeVersion(edge.properties(), scope.catalogVersion());
        }
        require(scope.nodes().stream().filter(n -> n.label().equals("Occupation")).count() == 1
                && scope.nodes().stream().anyMatch(n -> n.label().equals("Occupation")
                    && scope.occupationId().equals(n.properties().get("id"))), "Invalid Occupation scope");
        var config = SessionConfig.builder().withDefaultAccessMode(AccessMode.READ);
        if (database != null && !database.isBlank()) config.withDatabase(database);
        try (var session = driver.session(config.build())) {
            session.executeRead(tx -> {
                var actualNodes = tx.run("""
                        MATCH (n) WHERE n.id IN $ids
                        RETURN n.id AS id, labels(n) AS labels, properties(n) AS props
                        """, Map.of("ids", List.copyOf(ids))).list();
                require(actualNodes.size() == ids.size(), "Missing/ambiguous catalog node");
                Map<String, Node> expected = new TreeMap<>();
                scope.nodes().forEach(n -> expected.put((String) n.properties().get("id"), n));
                Set<String> seen = new HashSet<>();
                for (var actual : actualNodes) {
                    String id = actual.get("id").asString();
                    Node node = expected.get(id);
                    require(seen.add(id) && actual.get("labels").asList(v -> v.asString()).equals(List.of(node.label()))
                            && canonical(JSON.valueToTree(actual.get("props").asMap()))
                                .equals(canonical(JSON.valueToTree(node.properties()))),
                            "Catalog node differs from pinned snapshot: " + id);
                }
                // Outgoing membership + incoming ownership/teaching catches added paths and ambiguous owners.
                var actualEdges = tx.run("""
                        MATCH (a)-[r]->(b)
                        WHERE r.status='ACTIVE' AND (
                          (a.id IN $ids AND type(r) IN ['HAS_ROLE','HAS_LEVEL','HAS_COMPETENCY','HAS_SKILL','REQUIRES_SKILL'])
                          OR (b.id IN $ids AND type(r) IN ['HAS_ROLE','HAS_LEVEL','HAS_COMPETENCY','TEACHES']))
                        RETURN type(r) AS type, a.id AS source, b.id AS target, properties(r) AS props
                        """, Map.of("ids", List.copyOf(ids))).list();
                Set<String> expectedEdges = new HashSet<>();
                for (Edge edge : scope.relationships()) expectedEdges.add(edgeValue(edge.type(), edge.fromId(), edge.toId(),
                        JSON.valueToTree(edge.properties())));
                Set<String> observed = new HashSet<>();
                for (var edge : actualEdges) require(observed.add(edgeValue(edge.get("type").asString(),
                        edge.get("source").asString(), edge.get("target").asString(),
                        JSON.valueToTree(edge.get("props").asMap()))), "Duplicate graph relationship");
                require(observed.equals(expectedEdges), "Catalog membership/ownership differs from pinned snapshot");
                return null;
            });
        }
    }

    private static String edgeValue(String type, String from, String to, JsonNode properties) {
        return canonical(JSON.valueToTree(Map.of("type", type, "fromId", from, "toId", to, "properties", properties)));
    }

    private static void activeVersion(Map<String, Object> properties, String version) {
        text((String) properties.get("id"));
        require("ACTIVE".equals(properties.get("status")) && version.equals(properties.get("version")),
                "Inactive/incompatible catalog snapshot");
        require(Set.of("NEEDS_EXPERT_REVIEW", "APPROVED", "REJECTED").contains(properties.get("reviewStatus")),
                "Missing catalog review metadata");
    }
}
