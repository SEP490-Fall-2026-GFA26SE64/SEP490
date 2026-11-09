package com.adaptlearngraph.repository;

import com.adaptlearngraph.helper.AdaptiveBlueprintJson;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort.DependencyUnavailable;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import org.neo4j.driver.exceptions.Neo4jException;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionException;

/** TMP-REQ002-05: explicit server grant for one isolated local/demo catalog, never a production release adapter. */
public final class Neo4jAdaptiveBaselineCatalogAdapter implements AdaptiveBaselineCatalogPort {
    // Neo4jClient: tenant/shared-scoped optional-path snapshot with raw properties and elementIds for fingerprinting.
    private static final String QUERY = """
            MATCH (jobPosition:JobPosition {id:$jobPosition}) WHERE jobPosition.status='ACTIVE'
              AND (jobPosition.organizationId IS NULL OR jobPosition.organizationId=$organization)
            OPTIONAL MATCH (jobPosition)-[membership:HAS_ROLE]->(role:TargetRole)
            WHERE membership.status='ACTIVE' AND role.status IN ['ACTIVE','PUBLISHED']
              AND (role.organizationId IS NULL OR role.organizationId=$organization)
              AND (membership.organizationId IS NULL OR membership.organizationId=$organization)
            OPTIONAL MATCH (owner:JobPosition)-[ownership:HAS_ROLE]->(role)
            WHERE owner.status='ACTIVE' AND ownership.status='ACTIVE'
            WITH jobPosition,membership,role,collect(DISTINCT owner.id) AS owners
            OPTIONAL MATCH (role)-[roleLevel:HAS_LEVEL]->(level:Level)-[requirement:REQUIRES_SKILL]->(skill:MicroSkill)
            WHERE roleLevel.status='ACTIVE' AND level.status='ACTIVE' AND requirement.status='ACTIVE' AND skill.status='ACTIVE'
              AND (roleLevel.organizationId IS NULL OR roleLevel.organizationId=$organization)
              AND (level.organizationId IS NULL OR level.organizationId=$organization)
              AND (requirement.organizationId IS NULL OR requirement.organizationId=$organization)
              AND (skill.organizationId IS NULL OR skill.organizationId=$organization)
            RETURN elementId(jobPosition) AS jobPositionNode,elementId(role) AS roleNode,elementId(level) AS levelNode,elementId(skill) AS skillNode,
                   properties(jobPosition) AS jobPosition,properties(membership) AS membership,properties(role) AS role,
                   owners,properties(roleLevel) AS roleLevel,properties(level) AS level,
                   properties(requirement) AS requirement,properties(skill) AS skill
            """;
    private final boolean demoReview;
    private final Neo4jCypher graph;
    private final AdaptiveBlueprintJson json;
    private final UUID organizationId;
    private final Set<String> jobPositions;

    public Neo4jAdaptiveBaselineCatalogAdapter(Neo4jCypher graph, ObjectMapper mapper, UUID organizationId, Set<String> jobPositions) {
        this(graph, mapper, organizationId, jobPositions, false);
    }
    public Neo4jAdaptiveBaselineCatalogAdapter(Neo4jCypher graph, ObjectMapper mapper, UUID organizationId, Set<String> jobPositions, boolean demoReview) {
        this.demoReview = demoReview;
        this.graph = Objects.requireNonNull(graph);
        this.json = new AdaptiveBlueprintJson(mapper);
        this.organizationId = Objects.requireNonNull(organizationId, "Explicit local organization required");
        this.jobPositions = Set.copyOf(jobPositions);
        if (this.jobPositions.isEmpty() || this.jobPositions.stream().anyMatch(id -> id.isBlank() || !id.equals(id.strip()))) {
            throw new IllegalArgumentException("Explicit local JobPosition allowlist required");
        }
    }

    @Override
    public Optional<CatalogSnapshot> findAvailable(Scope scope) {
        if (!organizationId.equals(scope.organizationId()) || !jobPositions.contains(scope.jobPositionId())) return Optional.empty();
        try {
            return graph.read(tx -> {
                var rows = tx.list(QUERY, Map.of("jobPosition", scope.jobPositionId(), "organization", organizationId.toString()));
                if (rows.isEmpty()) return Optional.empty();
                if (rows.stream().map(row -> row.get("jobPositionNode").asString()).distinct().count() != 1) {
                    throw new IllegalArgumentException("Ambiguous JobPosition identity");
                }
                Map<String, Object> jobPosition = sanitizeMap(rows.getFirst().get("jobPosition").asMap());
                if (!published(jobPosition)) return Optional.empty();
                String name = text(jobPosition, "name");
                text(jobPosition, "id"); text(jobPosition, "version");
                var roleDefinitions = new LinkedHashMap<String, Map<String, Object>>();
                var skills = new LinkedHashMap<String, Map<String, SkillSnapshot>>();
                var nodeIdentities = new HashMap<String, String>();
                var paths = new TreeSet<String>();
                paths.add(json.canonicalObject(json.write(Map.of("jobPosition", jobPosition))));
                for (var row : rows) {
                    if (row.get("role").isNull()) continue;
                    Map<String, Object> role = sanitizeMap(row.get("role").asMap());
                    Map<String, Object> membership = sanitizeMap(row.get("membership").asMap());
                    if (!published(role) || !published(membership)) continue;
                    String roleId = text(role, "id");
                    uniqueNode(nodeIdentities, "role:" + roleId, row.get("roleNode").asString());
                    if (!Set.copyOf(row.get("owners").asList(value -> value.asString())).equals(Set.of(scope.jobPositionId()))) {
                        throw new IllegalArgumentException("Active role has ambiguous JobPosition ownership");
                    }
                    text(role, "name"); text(role, "version");
                    if (demoReview) {
                        membership.putIfAbsent("id", scope.jobPositionId() + ":" + roleId);
                        membership.putIfAbsent("version", role.getOrDefault("version", "0.12.0"));
                    }
                    text(membership, "id"); text(membership, "version");
                    roleDefinitions.put(roleId, role);
                    skills.computeIfAbsent(roleId, ignored -> new LinkedHashMap<>());
                    paths.add(json.canonicalObject(json.write(Map.of("role", role, "membership", membership))));
                    if (row.get("skill").isNull()) continue;
                    Map<String, Object> level = sanitizeMap(row.get("level").asMap());
                    Map<String, Object> roleLevel = sanitizeMap(row.get("roleLevel").asMap());
                    Map<String, Object> requirement = sanitizeMap(row.get("requirement").asMap());
                    Map<String, Object> skill = sanitizeMap(row.get("skill").asMap());
                    if (!published(level) || !published(roleLevel) || !published(requirement) || !published(skill)) continue;
                    text(level, "id"); text(level, "version");
                    if (demoReview) {
                        roleLevel.putIfAbsent("id", roleId + ":" + level.get("id"));
                        roleLevel.putIfAbsent("version", level.getOrDefault("version", "0.12.0"));
                        requirement.putIfAbsent("id", level.get("id") + ":" + skill.get("id"));
                        requirement.putIfAbsent("version", skill.getOrDefault("version", "0.12.0"));
                    }
                    text(roleLevel, "id"); text(roleLevel, "version");
                    uniqueNode(nodeIdentities, "level:" + text(level, "id"), row.get("levelNode").asString());
                    text(requirement, "id"); text(requirement, "version");
                    String skillId = text(skill, "id");
                    uniqueNode(nodeIdentities, "skill:" + skillId, row.get("skillNode").asString());
                    skills.get(roleId).put(skillId, new SkillSnapshot(text(skill, "name"), text(skill, "version")));
                    paths.add(json.canonicalObject(json.write(Map.of("roleId", roleId, "level", level, "roleLevel", roleLevel,
                            "requirement", requirement, "skill", skill))));
                }
                var roles = new LinkedHashMap<String, RoleSnapshot>();
                roleDefinitions.forEach((id, role) -> {
                    var roleSkills = skills.get(id);
                    if (roleSkills != null && !roleSkills.isEmpty()) {
                        roles.put(id, new RoleSnapshot(text(role, "name"), text(role, "version"), roleSkills));
                    } else if (!demoReview) {
                        roles.put(id, new RoleSnapshot(text(role, "name"), text(role, "version"), roleSkills));
                    }
                });
                if (roles.isEmpty() && demoReview) return Optional.empty();
                String fingerprint = AdaptiveBlueprintJson.hash("AB-CATALOG-V1:" + scope.organizationId() + ":" + json.write(paths));
                return Optional.of(new CatalogSnapshot(scope, name, fingerprint, roles));
            });
        } catch (Neo4jException | DataAccessException | TransactionException | IllegalArgumentException | IllegalStateException
                 | java.time.DateTimeException failure) {
            throw new DependencyUnavailable("Published JobPosition catalog is unavailable or inconsistent", failure);
        }
    }

    private static Map<String, Object> sanitizeMap(Map<String, Object> raw) {
        var copy = new LinkedHashMap<String, Object>();
        raw.forEach((k, v) -> {
            if (v == null || v instanceof String || v instanceof Number || v instanceof Boolean) {
                copy.put(k, v);
            } else if (v instanceof java.util.Collection<?> col) {
                copy.put(k, col.stream().map(x -> (x == null || x instanceof String || x instanceof Number || x instanceof Boolean) ? x : x.toString()).toList());
            } else {
                copy.put(k, v.toString());
            }
        });
        return copy;
    }

    private boolean published(Map<String, Object> properties) {
        Object st = properties.get("status");
        if (demoReview) return "ACTIVE".equals(st) || "PUBLISHED".equals(st);
        if (!"ACTIVE".equals(st) || !"APPROVED".equals(properties.get("reviewStatus"))) return false;
        text(properties, "reviewedBy");
        OffsetDateTime.parse(text(properties, "reviewedAt"));
        return true;
    }

    private static String text(Map<String, Object> properties, String key) {
        if (!(properties.get(key) instanceof String value) || value.isBlank() || !value.equals(value.strip())) {
            throw new IllegalArgumentException("Missing or invalid catalog " + key);
        }
        return value;
    }

    private static void uniqueNode(Map<String, String> identities, String id, String node) {
        String previous = identities.putIfAbsent(id, node);
        if (previous != null && !previous.equals(node)) throw new IllegalArgumentException("Duplicate catalog identity");
    }
}
