package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.PlatformCatalogTemplate.Edge;
import com.adaptlearngraph.repository.PlatformCatalogTemplate.Node;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Copies template nodes and relationships into one organization. Ids are derived from (organization, source id),
 * so retries are idempotent and two organizations copying the same template never share a node. Each copy is one
 * read-write {@code neo4jTransactionManager} transaction: per label one ownership check and one UNWIND MERGE, then one
 * UNWIND MERGE per (type, source label, target label) relationship group.
 */
public final class Neo4jWorkspaceCatalogWriter implements WorkspaceCatalogGraphWriter {
    private static final Set<String> LABELS = Set.of("JobPosition", "TargetRole", "Level", "Competency", "MicroSkill", "LearningModule");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
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
        var nodeById = new HashMap<String, Node>();
        for (Node node : nodes) {
            if (!LABELS.contains(node.label())) throw new IllegalArgumentException("Unsupported template label");
            ids.put(node.id(), copiedId(organizationId, node.id()));
            labels.put(node.id(), node.label());
            nodeById.put(node.id(), node);
        }

        Map<String, List<String>> roleToLevels = new HashMap<>();
        Map<String, List<String>> levelToComps = new HashMap<>();
        Map<String, List<String>> compToSkills = new HashMap<>();
        for (Edge edge : edges) {
            if ("HAS_LEVEL".equals(edge.type())) {
                roleToLevels.computeIfAbsent(edge.fromId(), k -> new ArrayList<>()).add(edge.toId());
            } else if ("HAS_COMPETENCY".equals(edge.type())) {
                levelToComps.computeIfAbsent(edge.fromId(), k -> new ArrayList<>()).add(edge.toId());
            } else if ("HAS_SKILL".equals(edge.type())) {
                compToSkills.computeIfAbsent(edge.fromId(), k -> new ArrayList<>()).add(edge.toId());
            }
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

            if ("TargetRole".equals(node.label())) {
                Map<String, List<String>> levelComps = new LinkedHashMap<>();
                Set<String> compIds = new LinkedHashSet<>();
                List<Map<String, Object>> skillTargets = new ArrayList<>();
                Set<String> seenSkillLevel = new HashSet<>();

                List<String> lvlIds = roleToLevels.getOrDefault(node.id(), List.of());
                for (String lvlId : lvlIds) {
                    Node lvlNode = nodeById.get(lvlId);
                    String lvlName = lvlNode != null && lvlNode.properties().get("name") != null
                            ? lvlNode.properties().get("name").toString().trim() : "Level";
                    List<String> cIds = levelToComps.getOrDefault(lvlId, List.of());
                    for (String cId : cIds) {
                        String copiedCompId = ids.get(cId);
                        if (copiedCompId != null) {
                            levelComps.computeIfAbsent(lvlName, k -> new ArrayList<>()).add(copiedCompId);
                            compIds.add(copiedCompId);
                        }
                        List<String> sIds = compToSkills.getOrDefault(cId, List.of());
                        for (String sId : sIds) {
                            String copiedSkillId = ids.get(sId);
                            Node sNode = nodeById.get(sId);
                            if (copiedSkillId != null && sNode != null && seenSkillLevel.add(copiedSkillId + ":" + lvlName)) {
                                String sCode = Objects.toString(sNode.properties().get("code"), sId);
                                String sName = Objects.toString(sNode.properties().get("name"), sCode);
                                List<String> knowledgeLevels = new ArrayList<>();
                                if ("Senior".equalsIgnoreCase(lvlName)) {
                                    knowledgeLevels.addAll(List.of("INTERMEDIATE", "ADVANCED"));
                                } else if ("Middle".equalsIgnoreCase(lvlName)) {
                                    knowledgeLevels.add("INTERMEDIATE");
                                } else {
                                    knowledgeLevels.add("FOUNDATION");
                                }
                                skillTargets.add(Map.of(
                                        "skillId", copiedSkillId,
                                        "skillCode", sCode,
                                        "skillName", sName,
                                        "level", lvlName,
                                        "requiredKnowledgeLevels", knowledgeLevels
                                ));
                            }
                        }
                    }
                }
                try {
                    properties.put("levelCompetencies", OBJECT_MAPPER.writeValueAsString(levelComps));
                    properties.put("skillTargets", OBJECT_MAPPER.writeValueAsString(skillTargets));
                } catch (Exception ignored) {}
                properties.put("competencyIds", new ArrayList<>(compIds));
            }

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
