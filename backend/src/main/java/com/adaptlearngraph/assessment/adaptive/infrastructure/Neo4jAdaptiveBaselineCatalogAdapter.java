package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort.DependencyUnavailable;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
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
import org.neo4j.driver.Driver;
import org.neo4j.driver.exceptions.Neo4jException;

/** TMP-REQ002-05: explicit server grant for one isolated local/demo catalog, never a production release adapter. */
public final class Neo4jAdaptiveBaselineCatalogAdapter implements AdaptiveBaselineCatalogPort {
    private static final String QUERY = """
            MATCH (occupation:Occupation {id:$occupation}) WHERE occupation.status='ACTIVE'
              AND (occupation.organizationId IS NULL OR occupation.organizationId=$organization)
            OPTIONAL MATCH (occupation)-[membership:HAS_ROLE]->(role:TargetRole)
            WHERE membership.status='ACTIVE' AND role.status='ACTIVE'
              AND (role.organizationId IS NULL OR role.organizationId=$organization)
              AND (membership.organizationId IS NULL OR membership.organizationId=$organization)
            OPTIONAL MATCH (owner:Occupation)-[ownership:HAS_ROLE]->(role)
            WHERE owner.status='ACTIVE' AND ownership.status='ACTIVE'
            WITH occupation,membership,role,collect(DISTINCT owner.id) AS owners
            OPTIONAL MATCH (role)-[roleLevel:HAS_LEVEL]->(level:Level)-[requirement:REQUIRES_SKILL]->(skill:MicroSkill)
            WHERE roleLevel.status='ACTIVE' AND level.status='ACTIVE' AND requirement.status='ACTIVE' AND skill.status='ACTIVE'
              AND (roleLevel.organizationId IS NULL OR roleLevel.organizationId=$organization)
              AND (level.organizationId IS NULL OR level.organizationId=$organization)
              AND (requirement.organizationId IS NULL OR requirement.organizationId=$organization)
              AND (skill.organizationId IS NULL OR skill.organizationId=$organization)
            RETURN elementId(occupation) AS occupationNode,elementId(role) AS roleNode,elementId(level) AS levelNode,elementId(skill) AS skillNode,
                   properties(occupation) AS occupation,properties(membership) AS membership,properties(role) AS role,
                   owners,properties(roleLevel) AS roleLevel,properties(level) AS level,
                   properties(requirement) AS requirement,properties(skill) AS skill
            """;
    private final Driver driver;
    private final AdaptiveBlueprintJson json;
    private final UUID organizationId;
    private final Set<String> occupations;

    public Neo4jAdaptiveBaselineCatalogAdapter(Driver driver, ObjectMapper mapper, UUID organizationId, Set<String> occupations) {
        this.driver = Objects.requireNonNull(driver);
        this.json = new AdaptiveBlueprintJson(mapper);
        this.organizationId = Objects.requireNonNull(organizationId, "Explicit local organization required");
        this.occupations = Set.copyOf(occupations);
        if (this.occupations.isEmpty() || this.occupations.stream().anyMatch(id -> id.isBlank() || !id.equals(id.strip()))) {
            throw new IllegalArgumentException("Explicit local Occupation allowlist required");
        }
    }

    @Override
    public Optional<CatalogSnapshot> findAvailable(Scope scope) {
        if (!organizationId.equals(scope.organizationId()) || !occupations.contains(scope.occupationId())) return Optional.empty();
        try (var session = driver.session()) {
            return session.executeRead(tx -> {
                var rows = tx.run(QUERY, Map.of("occupation", scope.occupationId(), "organization", organizationId.toString())).list();
                if (rows.isEmpty()) return Optional.empty();
                if (rows.stream().map(row -> row.get("occupationNode").asString()).distinct().count() != 1) {
                    throw new IllegalArgumentException("Ambiguous Occupation identity");
                }
                Map<String, Object> occupation = rows.getFirst().get("occupation").asMap();
                if (!published(occupation)) return Optional.empty();
                String name = text(occupation, "name");
                text(occupation, "id"); text(occupation, "version");
                var roleDefinitions = new LinkedHashMap<String, Map<String, Object>>();
                var skills = new LinkedHashMap<String, Map<String, SkillSnapshot>>();
                var nodeIdentities = new HashMap<String, String>();
                var paths = new TreeSet<String>();
                paths.add(json.canonicalObject(json.write(Map.of("occupation", occupation))));
                for (var row : rows) {
                    if (row.get("role").isNull()) continue;
                    Map<String, Object> role = row.get("role").asMap();
                    Map<String, Object> membership = row.get("membership").asMap();
                    if (!published(role) || !published(membership)) continue;
                    String roleId = text(role, "id");
                    uniqueNode(nodeIdentities, "role:" + roleId, row.get("roleNode").asString());
                    if (!Set.copyOf(row.get("owners").asList(value -> value.asString())).equals(Set.of(scope.occupationId()))) {
                        throw new IllegalArgumentException("Active role has ambiguous Occupation ownership");
                    }
                    text(role, "name"); text(role, "version"); text(membership, "id"); text(membership, "version");
                    roleDefinitions.put(roleId, role);
                    skills.computeIfAbsent(roleId, ignored -> new LinkedHashMap<>());
                    paths.add(json.canonicalObject(json.write(Map.of("role", role, "membership", membership))));
                    if (row.get("skill").isNull()) continue;
                    Map<String, Object> level = row.get("level").asMap();
                    Map<String, Object> roleLevel = row.get("roleLevel").asMap();
                    Map<String, Object> requirement = row.get("requirement").asMap();
                    Map<String, Object> skill = row.get("skill").asMap();
                    if (!published(level) || !published(roleLevel) || !published(requirement) || !published(skill)) continue;
                    text(level, "id"); text(level, "version"); text(roleLevel, "id"); text(roleLevel, "version");
                    uniqueNode(nodeIdentities, "level:" + text(level, "id"), row.get("levelNode").asString());
                    text(requirement, "id"); text(requirement, "version");
                    String skillId = text(skill, "id");
                    uniqueNode(nodeIdentities, "skill:" + skillId, row.get("skillNode").asString());
                    skills.get(roleId).put(skillId, new SkillSnapshot(text(skill, "name"), text(skill, "version")));
                    paths.add(json.canonicalObject(json.write(Map.of("roleId", roleId, "level", level, "roleLevel", roleLevel,
                            "requirement", requirement, "skill", skill))));
                }
                var roles = new LinkedHashMap<String, RoleSnapshot>();
                roleDefinitions.forEach((id, role) -> roles.put(id, new RoleSnapshot(text(role, "name"), text(role, "version"), skills.get(id))));
                String fingerprint = AdaptiveBlueprintJson.hash("AB-CATALOG-V1:" + scope.organizationId() + ":" + json.write(paths));
                return Optional.of(new CatalogSnapshot(scope, name, fingerprint, roles));
            });
        } catch (Neo4jException | IllegalArgumentException | IllegalStateException | java.time.DateTimeException failure) {
            throw new DependencyUnavailable("Published Occupation catalog is unavailable or inconsistent", failure);
        }
    }

    private static boolean published(Map<String, Object> properties) {
        if (!"ACTIVE".equals(properties.get("status")) || !"APPROVED".equals(properties.get("reviewStatus"))) return false;
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
