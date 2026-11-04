package com.adaptlearngraph.helper;

import com.adaptlearngraph.repository.Neo4jOfficialCatalogScopeReader;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import static com.adaptlearngraph.dtos.OfficialQuestionBankManifest.*;

/** Exact read-only parity check; approval and tenant publication are not synthesized here. */
public final class OfficialQuestionBankCatalog {
    public record Node(String label, Map<String, Object> properties) {}
    public record Edge(String type, String fromId, String toId, Map<String, Object> properties) {}
    public record Scope(String sourceSha256, String jobPositionId, String catalogVersion, List<Node> nodes,
                 List<Edge> relationships) {
        public Map<String, String> skills() {
            Map<String, String> result = new TreeMap<>();
            nodes.stream().filter(node -> node.label().equals("MicroSkill")).forEach(node ->
                    require(result.put((String) node.properties().get("id"), (String) node.properties().get("name")) == null,
                            "Duplicate skill identity"));
            return result;
        }
    }

    /** Compares the live graph read through {@code graph} (one read transaction on its configured database) with the scope. */
    public void verify(Neo4jOfficialCatalogScopeReader graph, Scope scope) {
        require(scope.nodes() != null && scope.relationships() != null, "Missing catalog scope");
        Set<String> ids = new HashSet<>();
        Set<String> edges = new HashSet<>();
        for (Node node : scope.nodes()) {
            require(Set.of("JobPosition", "TargetRole", "Level", "Competency", "MicroSkill", "LearningModule")
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
        require(scope.nodes().stream().filter(n -> n.label().equals("JobPosition")).count() == 1
                && scope.nodes().stream().anyMatch(n -> n.label().equals("JobPosition")
                    && scope.jobPositionId().equals(n.properties().get("id"))), "Invalid JobPosition scope");
        var snapshot = graph.read(List.copyOf(ids));
        var actualNodes = snapshot.nodes();
        require(actualNodes.size() == ids.size(), "Missing/ambiguous catalog node");
        Map<String, Node> expected = new TreeMap<>();
        scope.nodes().forEach(n -> expected.put((String) n.properties().get("id"), n));
        Set<String> seen = new HashSet<>();
        for (var actual : actualNodes) {
            String id = actual.id();
            Node node = expected.get(id);
            require(seen.add(id) && actual.labels().equals(List.of(node.label()))
                    && canonical(JSON.valueToTree(actual.properties()))
                        .equals(canonical(JSON.valueToTree(node.properties()))),
                    "Catalog node differs from pinned snapshot: " + id);
        }
        // Outgoing membership + incoming ownership/teaching catches added paths and ambiguous owners.
        Set<String> expectedEdges = new HashSet<>();
        for (Edge edge : scope.relationships()) expectedEdges.add(edgeValue(edge.type(), edge.fromId(), edge.toId(),
                JSON.valueToTree(edge.properties())));
        Set<String> observed = new HashSet<>();
        for (var edge : snapshot.edges()) require(observed.add(edgeValue(edge.type(), edge.source(), edge.target(),
                JSON.valueToTree(edge.properties()))), "Duplicate graph relationship");
        require(observed.equals(expectedEdges), "Catalog membership/ownership differs from pinned snapshot");
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
