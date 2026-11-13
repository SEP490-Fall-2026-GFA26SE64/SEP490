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

        Set<String> retainedLevelComps = new HashSet<>();
        Set<String> retainedLevelSkills = new HashSet<>();
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

            if ("MicroSkill".equals(node.label())) {
                String code = node.properties().get("code") != null ? node.properties().get("code").toString() : node.id();
                properties.put("code", code);
            }

            if ("TargetRole".equals(node.label())) {
                properties.put("assignedExpertId", null);
                Map<String, List<String>> levelComps = new LinkedHashMap<>();
                Set<String> compIds = new LinkedHashSet<>();
                List<Map<String, Object>> skillTargets = new ArrayList<>();
                Set<String> seenSkillLevel = new HashSet<>();

                List<String> lvlIds = roleToLevels.getOrDefault(node.id(), List.of());
                for (String lvlId : lvlIds) {
                    Node lvlNode = nodeById.get(lvlId);
                    String lvlName = lvlNode != null && lvlNode.properties().get("name") != null
                            ? lvlNode.properties().get("name").toString().trim() : "Level";
                    List<String> allCIds = levelToComps.getOrDefault(lvlId, List.of());
                    List<String> cIds = allCIds.stream().limit(2).toList();
                    for (String cId : cIds) {
                        retainedLevelComps.add(lvlId + ":" + cId);
                        String copiedCompId = ids.get(cId);
                        if (copiedCompId != null) {
                            levelComps.computeIfAbsent(lvlName, k -> new ArrayList<>()).add(copiedCompId);
                            compIds.add(copiedCompId);
                        }
                    }

                    int levelSkillLimit = 3;
                    int levelSkillCount = 0;
                    for (int i = 0; i < cIds.size() && levelSkillCount < levelSkillLimit; i++) {
                        String cId = cIds.get(i);
                        List<String> allSIds = compToSkills.getOrDefault(cId, List.of());
                        int maxForThisComp = (cIds.size() > 1 && i == 0) ? 2 : (levelSkillLimit - levelSkillCount);
                        List<String> sIds = allSIds.stream().limit(maxForThisComp).toList();
                        for (String sId : sIds) {
                            if (levelSkillCount >= levelSkillLimit) break;
                            retainedLevelSkills.add(lvlId + ":" + sId);
                            levelSkillCount++;

                            String copiedSkillId = ids.get(sId);
                            Node sNode = nodeById.get(sId);
                            if (copiedSkillId != null && sNode != null && seenSkillLevel.add(copiedSkillId + ":" + lvlName)) {
                                String sCode = sNode.properties().get("code") != null ? sNode.properties().get("code").toString() : sId;
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
            if ("HAS_COMPETENCY".equals(edge.type()) && !retainedLevelComps.isEmpty() && !retainedLevelComps.contains(edge.fromId() + ":" + edge.toId())) continue;
            if ("REQUIRES_SKILL".equals(edge.type()) && !retainedLevelSkills.isEmpty() && !retainedLevelSkills.contains(edge.fromId() + ":" + edge.toId())) continue;
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

            // Align and enrich Competencies for the imported organization:
            // 1. Assign job position code and title via role hierarchy
            tx.execute("""
                MATCH (jp:JobPosition {organizationId: $organization})-[:HAS_ROLE]->(tr:TargetRole {organizationId: $organization})-[:HAS_LEVEL]->(lvl:Level {organizationId: $organization})-[:HAS_COMPETENCY]->(c:Competency {organizationId: $organization})
                SET c.jobPositionCode = coalesce(c.jobPositionCode, jp.code),
                    c.jobPositionTitle = coalesce(c.jobPositionTitle, jp.name)
            """, Map.of("organization", organizationId));

            // 2. Semantic fallback for any competency not reached via role hierarchy
            tx.execute("""
                MATCH (c:Competency {organizationId: $organization})
                WHERE c.jobPositionCode IS NULL OR c.jobPositionCode = '' OR c.jobPositionTitle IS NULL OR c.jobPositionTitle = ''
                WITH c
                OPTIONAL MATCH (jp_qa:JobPosition {organizationId: $organization, code: '15-1253.00'})
                OPTIONAL MATCH (jp_data:JobPosition {organizationId: $organization, code: '15-1243.00'})
                OPTIONAL MATCH (jp_cloud:JobPosition {organizationId: $organization, code: '15-1299.08'})
                OPTIONAL MATCH (jp_sec:JobPosition {organizationId: $organization, code: '15-1212.00'})
                OPTIONAL MATCH (jp_dev:JobPosition {organizationId: $organization, code: '15-1252.00'})
                OPTIONAL MATCH (any_jp:JobPosition {organizationId: $organization})
                WITH c,
                     coalesce(jp_qa, jp_dev, any_jp) AS sel_jp_qa,
                     coalesce(jp_data, jp_dev, any_jp) AS sel_jp_data,
                     coalesce(jp_cloud, jp_dev, any_jp) AS sel_jp_cloud,
                     coalesce(jp_sec, jp_dev, any_jp) AS sel_jp_sec,
                     coalesce(jp_dev, any_jp) AS sel_jp_dev
                SET c.jobPositionCode = CASE
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'TEXEC' OR toUpper(coalesce(c.code, '')) CONTAINS 'TAUTO' OR toUpper(coalesce(c.code, '')) CONTAINS 'TDES' OR toLower(c.name) CONTAINS 'test' OR toLower(c.name) CONTAINS 'quality' THEN sel_jp_qa.code
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DPIPE' OR toUpper(coalesce(c.code, '')) CONTAINS 'DMOD' OR toUpper(coalesce(c.code, '')) CONTAINS 'DQ' OR toUpper(coalesce(c.code, '')) CONTAINS 'DGOV' OR toLower(c.name) CONTAINS 'data' THEN sel_jp_data.code
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DELIV' OR toUpper(coalesce(c.code, '')) CONTAINS 'INFRA' OR toUpper(coalesce(c.code, '')) CONTAINS 'OPS' OR toUpper(coalesce(c.code, '')) CONTAINS 'ARCH' OR toLower(c.name) CONTAINS 'cloud' OR toLower(c.name) CONTAINS 'architecture' THEN sel_jp_cloud.code
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'SGOV' OR toUpper(coalesce(c.code, '')) CONTAINS 'SEC' OR toLower(c.name) CONTAINS 'security' THEN sel_jp_sec.code
                        ELSE sel_jp_dev.code
                    END,
                    c.jobPositionTitle = CASE
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'TEXEC' OR toUpper(coalesce(c.code, '')) CONTAINS 'TAUTO' OR toUpper(coalesce(c.code, '')) CONTAINS 'TDES' OR toLower(c.name) CONTAINS 'test' OR toLower(c.name) CONTAINS 'quality' THEN sel_jp_qa.name
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DPIPE' OR toUpper(coalesce(c.code, '')) CONTAINS 'DMOD' OR toUpper(coalesce(c.code, '')) CONTAINS 'DQ' OR toUpper(coalesce(c.code, '')) CONTAINS 'DGOV' OR toLower(c.name) CONTAINS 'data' THEN sel_jp_data.name
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'DELIV' OR toUpper(coalesce(c.code, '')) CONTAINS 'INFRA' OR toUpper(coalesce(c.code, '')) CONTAINS 'OPS' OR toUpper(coalesce(c.code, '')) CONTAINS 'ARCH' OR toLower(c.name) CONTAINS 'cloud' OR toLower(c.name) CONTAINS 'architecture' THEN sel_jp_cloud.name
                        WHEN toUpper(coalesce(c.code, '')) CONTAINS 'SGOV' OR toUpper(coalesce(c.code, '')) CONTAINS 'SEC' OR toLower(c.name) CONTAINS 'security' THEN sel_jp_sec.name
                        ELSE sel_jp_dev.name
                    END
            """, Map.of("organization", organizationId));

            // 3. Deduplicate competencies with identical name in this organization:
            // Rewire relationships to the canonical competency and remove duplicate nodes
            tx.execute("""
                MATCH (c:Competency {organizationId: $organization})
                WITH c.name AS name, collect(c) AS comps
                WHERE size(comps) > 1
                WITH comps[0] AS canonical, comps[1..] AS duplicates
                UNWIND duplicates AS dup
                OPTIONAL MATCH (l:Level {organizationId: $organization})-[:HAS_COMPETENCY]->(dup)
                WITH canonical, dup, collect(DISTINCT l) AS levels
                FOREACH (lvl IN levels |
                    MERGE (lvl)-[:HAS_COMPETENCY {id: 'copy-link:' + lvl.id + ':' + canonical.id, organizationId: $organization}]->(canonical)
                )
                WITH canonical, dup
                OPTIONAL MATCH (dup)-[:HAS_SKILL]->(s:MicroSkill {organizationId: $organization})
                WITH canonical, dup, collect(DISTINCT s) AS skills
                FOREACH (sk IN skills |
                    MERGE (canonical)-[:HAS_SKILL {id: 'copy-link:' + canonical.id + ':' + sk.id, organizationId: $organization}]->(sk)
                )
                DETACH DELETE dup
            """, Map.of("organization", organizationId));

            // 4. Refresh TargetRole competencyIds with the canonical competency IDs
            tx.execute("""
                MATCH (tr:TargetRole {organizationId: $organization})-[:HAS_LEVEL]->(lvl:Level)-[:HAS_COMPETENCY]->(c:Competency)
                WITH tr, collect(DISTINCT c.id) AS canonicalCompIds
                SET tr.competencyIds = canonicalCompIds
            """, Map.of("organization", organizationId));

            // 5. Assign departmentId and departmentName to competencies based on job position and department match
            tx.execute("""
                MATCH (c:Competency {organizationId: $organization})
                WHERE c.departmentId IS NULL OR c.departmentId = '' OR c.departmentName IS NULL OR c.departmentName = ''
                WITH c
                OPTIONAL MATCH (d_qa:Department {organizationId: $organization}) WHERE toUpper(d_qa.code) CONTAINS 'QA' OR toLower(d_qa.name) CONTAINS 'quality' OR toLower(d_qa.name) CONTAINS 'test'
                OPTIONAL MATCH (d_data:Department {organizationId: $organization}) WHERE toUpper(d_data.code) CONTAINS 'DATA' OR toLower(d_data.name) CONTAINS 'data' OR toLower(d_data.name) CONTAINS 'database'
                OPTIONAL MATCH (d_cloud:Department {organizationId: $organization}) WHERE toUpper(d_cloud.code) CONTAINS 'CLOUD' OR toLower(d_cloud.name) CONTAINS 'cloud' OR toLower(d_cloud.name) CONTAINS 'infrastructure' OR toLower(d_cloud.name) CONTAINS 'devops'
                OPTIONAL MATCH (d_sec:Department {organizationId: $organization}) WHERE toUpper(d_sec.code) CONTAINS 'SEC' OR toLower(d_sec.name) CONTAINS 'security' OR toLower(d_sec.name) CONTAINS 'compliance'
                OPTIONAL MATCH (d_soft:Department {organizationId: $organization}) WHERE toUpper(d_soft.code) CONTAINS 'COG' OR toUpper(d_soft.code) CONTAINS 'DEV' OR toLower(d_soft.name) CONTAINS 'software' OR toLower(d_soft.name) CONTAINS 'engineering'
                OPTIONAL MATCH (any_d:Department {organizationId: $organization})
                WITH c,
                     coalesce(d_qa, d_soft, any_d) AS sel_d_qa,
                     coalesce(d_data, d_soft, any_d) AS sel_d_data,
                     coalesce(d_cloud, d_soft, any_d) AS sel_d_cloud,
                     coalesce(d_sec, d_soft, any_d) AS sel_d_sec,
                     coalesce(d_soft, any_d) AS sel_d_soft
                SET c.departmentId = CASE
                        WHEN c.jobPositionCode = '15-1253.00' THEN sel_d_qa.id
                        WHEN c.jobPositionCode = '15-1243.00' THEN sel_d_data.id
                        WHEN c.jobPositionCode = '15-1299.08' THEN sel_d_cloud.id
                        WHEN c.jobPositionCode = '15-1212.00' THEN sel_d_sec.id
                        ELSE sel_d_soft.id
                    END,
                    c.departmentName = CASE
                        WHEN c.jobPositionCode = '15-1253.00' THEN sel_d_qa.name
                        WHEN c.jobPositionCode = '15-1243.00' THEN sel_d_data.name
                        WHEN c.jobPositionCode = '15-1299.08' THEN sel_d_cloud.name
                        WHEN c.jobPositionCode = '15-1212.00' THEN sel_d_sec.name
                        ELSE sel_d_soft.name
                    END
            """, Map.of("organization", organizationId));

            // 6. Clean any jobPositionTitle containing code prefixes so titles are strictly unified
            tx.execute("""
                MATCH (c:Competency {organizationId: $organization})
                WHERE c.jobPositionTitle CONTAINS ' - '
                SET c.jobPositionTitle = trim(split(c.jobPositionTitle, ' - ')[1])
            """, Map.of("organization", organizationId));

            return null;
        });
    }
}
