package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.OrganizationStructure;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Writes an imported organization structure (Department -HAS_JOB_POSITION-> JobPosition -HAS_ROLE-> TargetRole
 * -HAS_LEVEL-> Level) into one organization. Ids are derived from (organization, node kind, code), so retries are
 * idempotent and two organizations importing the same codes never share a node. Each import is one read-write
 * {@code neo4jTransactionManager} transaction: per label one ownership check and one UNWIND MERGE, then one UNWIND MERGE
 * per relationship type.
 */
public final class Neo4jWorkspaceCatalogWriter implements WorkspaceCatalogGraphWriter {
    static final String SOURCE = "REGISTRATION_IMPORT";
    private static final String VERSION = "1";
    private final Supplier<Neo4jCypher> graph;

    /** The graph is resolved lazily so the worker bean can be created before Neo4j is reachable. */
    public Neo4jWorkspaceCatalogWriter(Supplier<Neo4jCypher> graph) {
        this.graph = graph;
    }

    public static String importedId(String organizationId, String kind, String key) {
        return UUID.nameUUIDFromBytes(("structure-import:" + organizationId + ":" + kind + ":" + key.toUpperCase(Locale.ROOT))
                .getBytes(StandardCharsets.UTF_8)).toString();
    }

    @Override
    public void writeStructure(String organizationId, OrganizationStructure structure, Instant now) {
        Neo4jTenantGuard.requireOrganization(organizationId);
        String timestamp = now.toString();
        var nodes = new LinkedHashMap<String, List<Map<String, Object>>>();
        var edges = new LinkedHashMap<String, List<Map<String, Object>>>();
        for (var department : structure.departments()) {
            String departmentId = importedId(organizationId, "Department", department.code());
            var props = base(organizationId, departmentId, department.code(), department.name(), timestamp);
            props.put("description", department.description());
            add(nodes, "Department", props);
            for (var job : department.jobPositions()) {
                String jobId = importedId(organizationId, "JobPosition", job.code());
                add(nodes, "JobPosition", base(organizationId, jobId, job.code(), job.name(), timestamp));
                edge(edges, "HAS_JOB_POSITION", organizationId, departmentId, jobId);
                for (var role : job.targetRoles()) {
                    String roleId = importedId(organizationId, "TargetRole", role.code());
                    var roleProps = base(organizationId, roleId, role.code(), role.name(), timestamp);
                    // Imported roles have no skill requirements yet: staged for staffing until L&D/Expert complete them.
                    roleProps.put("status", "STAGED");
                    roleProps.put("title", role.name());
                    roleProps.put("scope", role.scope());
                    roleProps.put("description", role.scope());
                    roleProps.put("skillTargets", "[]");
                    roleProps.put("levelCompetencies", "{}");
                    roleProps.put("competencyIds", List.of());
                    add(nodes, "TargetRole", roleProps);
                    edge(edges, "HAS_ROLE", organizationId, jobId, roleId);
                    for (var level : role.levels()) {
                        String levelId = importedId(organizationId, "Level", role.code() + ":" + level.rank());
                        var levelProps = base(organizationId, levelId, level.code(), level.name(), timestamp);
                        levelProps.put("rank", (long) level.rank());
                        levelProps.put("attainmentRule", "ALL_MANDATORY_SKILLS");
                        add(nodes, "Level", levelProps);
                        edge(edges, "HAS_LEVEL", organizationId, roleId, levelId);
                    }
                }
            }
        }
        // Labels/types below come only from the fixed literals above; Cypher cannot parameterize them.
        graph.get().write(tx -> {
            for (var group : nodes.entrySet()) {
                var ids = group.getValue().stream().map(row -> row.get("id")).toList();
                boolean foreign = tx.single("UNWIND $ids AS id MATCH (n:" + group.getKey() + " {id: id}) "
                                + "WHERE coalesce(n.organizationId, '') <> $organization RETURN count(n) > 0 AS foreign",
                        Map.of("ids", ids, "organization", organizationId)).get("foreign").asBoolean();
                if (foreign) throw new com.adaptlearngraph.exception.CrossTenantWriteException();
                tx.execute("UNWIND $rows AS row MERGE (n:" + group.getKey() + " {id: row.id}) SET n = row.props",
                        Map.of("rows", group.getValue()));
            }
            for (var group : edges.entrySet()) {
                String[] labels = switch (group.getKey()) {
                    case "HAS_JOB_POSITION" -> new String[]{"Department", "JobPosition"};
                    case "HAS_ROLE" -> new String[]{"JobPosition", "TargetRole"};
                    default -> new String[]{"TargetRole", "Level"};
                };
                tx.execute("UNWIND $rows AS row MATCH (a:" + labels[0] + " {id: row.from}) MATCH (b:" + labels[1] + " {id: row.to}) "
                                + "WHERE a.organizationId = $organization AND b.organizationId = $organization "
                                + "MERGE (a)-[r:" + group.getKey() + " {id: row.id}]->(b) SET r = row.props",
                        Map.of("rows", group.getValue(), "organization", organizationId));
            }
            return null;
        });
    }

    private static Map<String, Object> base(String organizationId, String id, String code, String name, String timestamp) {
        var props = new LinkedHashMap<String, Object>();
        props.put("id", id);
        props.put("organizationId", organizationId);
        props.put("code", code);
        props.put("name", name);
        props.put("status", "ACTIVE");
        props.put("version", VERSION);
        props.put("source", SOURCE);
        props.put("createdAt", timestamp);
        props.put("updatedAt", timestamp);
        return props;
    }

    private static void add(Map<String, List<Map<String, Object>>> nodes, String label, Map<String, Object> props) {
        nodes.computeIfAbsent(label, key -> new ArrayList<>()).add(Map.of("id", props.get("id"), "props", props));
    }

    private static void edge(Map<String, List<Map<String, Object>>> edges, String type, String organizationId, String from, String to) {
        String id = importedId(organizationId, type, from + ":" + to);
        var props = new LinkedHashMap<String, Object>();
        props.put("id", id);
        props.put("organizationId", organizationId);
        props.put("status", "ACTIVE");
        props.put("version", VERSION);
        edges.computeIfAbsent(type, key -> new ArrayList<>()).add(Map.of("from", from, "to", to, "id", id, "props", props));
    }
}
