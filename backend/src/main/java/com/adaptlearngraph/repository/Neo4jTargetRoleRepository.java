package com.adaptlearngraph.repository;

import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.RoleTrack;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;
import com.adaptlearngraph.entities.TargetRoleNode;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiFunction;
import org.neo4j.driver.Record;
import org.neo4j.driver.types.MapAccessor;
import org.neo4j.driver.types.TypeSystem;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.data.neo4j.core.mapping.Neo4jMappingContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jTargetRoleRepository implements TargetRoleRepository {
    private static final Instant BASELINE = Instant.parse("2026-01-01T00:00:00Z");
    private static final String GRAPH_SKILLS = """
            OPTIONAL MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
            WITH r, collect(CASE WHEN s IS NOT NULL THEN {
                skillId: s.id,
                skillCode: s.code,
                skillName: s.name,
                threshold: toInteger(round(coalesce(req.targetMastery, 0.0) * 100)),
                level: coalesce(req.level, '')
            } END) AS graphSkills
            """;
    // Neo4jClient: the role node is mapped by SDN; its REQUIRES_SKILL targets are collected into one extra column.
    private static final String BY_ID = """
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId
              AND (r.id = $id
                   OR r.code = $id
                   OR r.baseCode = $id
                   OR (r.baseCode IS NOT NULL AND $id STARTS WITH r.baseCode AND coalesce(r.version, '1.0') = substring($id, size(r.baseCode) + 2, 3))
                   OR (r.baseCode IS NOT NULL AND $id CONTAINS r.baseCode AND (r.version IS NOT NULL AND $id CONTAINS r.version)))
              AND coalesce(r.status, 'ACTIVE') <> 'SUPERSEDED'
            """ + GRAPH_SKILLS + """
            RETURN r, graphSkills
            """;
    private static final String BY_CODE = """
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId AND (r.code = $code OR r.baseCode = $code)
            """ + GRAPH_SKILLS + """
            RETURN r, graphSkills
            """;

    private final TargetRoleNodeRepository roles;
    private final Neo4jClient client;
    private final Neo4jMappingContext mappingContext;
    private final TransactionTemplate reads;
    private final TransactionTemplate writes;
    private final ObjectMapper objectMapper;

    public Neo4jTargetRoleRepository(TargetRoleNodeRepository roles, Neo4jClient client, Neo4jMappingContext mappingContext,
            PlatformTransactionManager transactions) {
        this.roles = Objects.requireNonNull(roles, "roles cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.mappingContext = Objects.requireNonNull(mappingContext, "mapping context cannot be null");
        mappingContext.getRequiredPersistentEntity(TargetRoleNode.class);
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
        this.objectMapper = new ObjectMapper();
    }

    // SDN mapping functions keep an identity cache for one result set; obtain a fresh one per query.
    private BiFunction<TypeSystem, MapAccessor, TargetRoleNode> nodes() {
        return mappingContext.getRequiredMappingFunctionFor(TargetRoleNode.class);
    }

    @Override
    public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
        Objects.requireNonNull(organizationId, "organizationId");
        Objects.requireNonNull(code, "code");
        return Boolean.TRUE.equals(reads.execute(status -> roles.existsByCode(organizationId, code)));
    }

    @Override
    public boolean existsByOrganizationIdAndCodeAndVersion(String organizationId, String code, String version) {
        Objects.requireNonNull(organizationId, "organizationId");
        Objects.requireNonNull(code, "code");
        String normalizedVersion = (version != null && !version.isBlank()) ? version.trim() : "1.0";
        return Boolean.TRUE.equals(reads.execute(status -> roles.existsByCodeAndVersion(organizationId, code, normalizedVersion)));
    }

    @Override
    public TargetRole save(TargetRole targetRole) {
        String rawCode = targetRole.getCode();
        String roleIdStr = targetRole.getId().toString();
        String version = (targetRole.getVersion() != null && !targetRole.getVersion().isBlank())
                ? targetRole.getVersion().trim()
                : "1.0";
        String organizationId = targetRole.getOrganizationId();

        writes.executeWithoutResult(status -> {
            // If client passed a generated or alias ID, locate existing persisted node ID
            String matchedId = roles.findPersistedId(organizationId, roleIdStr, rawCode, version).orElse(roleIdStr);

            // Determine unique graph code to satisfy Neo4j's target_role_code constraint when versions or orgs differ
            String graphCode = resolveGraphCode(matchedId, organizationId, rawCode, version);
            String updatedAt = targetRole.getUpdatedAt().toString();

            Neo4jTenantGuard.requireOwnedOrAbsent(client, "TargetRole", matchedId, organizationId);
            roles.merge(matchedId, organizationId, graphCode, rawCode, targetRole.getName(), targetRole.getFamilyCode(),
                    targetRole.getTrack().name(), targetRole.getAssignedExpertId(), targetRole.getDescription(),
                    targetRole.getResponsibilities() != null ? targetRole.getResponsibilities() : List.of(),
                    targetRole.getStatus().name(), version, targetRole.getSkillTargets(), targetRole.getLevels(),
                    targetRole.getLevelCompetencies(),
                    targetRole.getCompetencyIds() != null ? targetRole.getCompetencyIds() : List.of(),
                    targetRole.getCreatedAt().toString(), updatedAt, targetRole.getRejectionReason());

            // When publishing, override and supersede any previous version of this role
            if (targetRole.getStatus() == RoleStatus.PUBLISHED || targetRole.getStatus() == RoleStatus.ACTIVE) {
                roles.supersedeOtherVersions(organizationId, matchedId, targetRole.getName(), rawCode, graphCode, updatedAt);
            }

            // Synchronize REQUIRES_SKILL graph edges
            syncSkillRelationships(organizationId, roleIdStr, targetRole.getSkillTargets(), targetRole.getUpdatedAt());
        });
        return targetRole;
    }

    private String resolveGraphCode(String roleId, String orgId, String rawCode, String version) {
        if (roles.countCodeHolders(rawCode, roleId) == 0) {
            return rawCode;
        }
        // Code is already claimed by another node, append unique suffix for this version/tenant
        return rawCode + "#" + orgId + "#v" + version;
    }

    private void syncSkillRelationships(String organizationId, String roleId, String skillTargetsJson, Instant updatedAt) {
        List<Map<String, Object>> skillItems = parseSkillTargetsJson(skillTargetsJson);
        List<Map<String, Object>> processedSkills = new ArrayList<>();

        for (Map<String, Object> item : skillItems) {
            String code = Objects.toString(item.get("skillCode"), "").trim();
            if (!code.isBlank()) {
                Map<String, Object> skillData = new HashMap<>();
                skillData.put("skillCode", code);
                skillData.put("skillName", Objects.toString(item.get("skillName"), code));
                skillData.put("skillId", Objects.toString(item.get("skillId"), UUID.randomUUID().toString()));
                String level = Objects.toString(item.get("level"), "");
                skillData.put("level", level);
                Number threshold = 70;
                if (item.get("threshold") instanceof Number n) {
                    threshold = n;
                }
                skillData.put("threshold", threshold.intValue());
                processedSkills.add(skillData);
            }
        }

        // 1. Delete existing REQUIRES_SKILL edges for this role to prevent stale or duplicate edges
        roles.deleteRequiredSkills(roleId, organizationId);

        // 2. Merge current REQUIRES_SKILL edges distinguishing per-level assignments
        if (!processedSkills.isEmpty()) {
            roles.mergeRequiredSkills(organizationId, roleId, processedSkills, updatedAt.toString());
        }
    }

    private List<String> resolveExpertVariants(String expertId) {
        if (expertId == null || expertId.isBlank()) return List.of();
        String trimmed = expertId.trim();
        if ("expert-chen".equalsIgnoreCase(trimmed) || "a0000000-0000-0000-0000-000000000002".equalsIgnoreCase(trimmed)) {
            return List.of("expert-chen", "a0000000-0000-0000-0000-000000000002");
        }
        if ("expert-vance".equalsIgnoreCase(trimmed) || "a0000000-0000-0000-0000-000000000005".equalsIgnoreCase(trimmed)) {
            return List.of("expert-vance", "a0000000-0000-0000-0000-000000000005");
        }
        if ("expert-rivera".equalsIgnoreCase(trimmed) || "a0000000-0000-0000-0000-000000000006".equalsIgnoreCase(trimmed)) {
            return List.of("expert-rivera", "a0000000-0000-0000-0000-000000000006");
        }
        if ("expert-nguyen".equalsIgnoreCase(trimmed) || "a0000000-0000-0000-0000-000000000007".equalsIgnoreCase(trimmed)) {
            return List.of("expert-nguyen", "a0000000-0000-0000-0000-000000000007");
        }
        return List.of(trimmed);
    }

    // Neo4jClient: optional filters are appended to one statement (one query per list, never per row).
    @Override
    public List<TargetRole> findByOrganizationId(String organizationId, TargetRoleFilter filter) {
        StringBuilder cypher = new StringBuilder("""
                MATCH (r:TargetRole)
                WHERE r.organizationId = $organizationId
                  AND coalesce(r.status, 'ACTIVE') <> 'SUPERSEDED'
                """);
        Map<String, Object> params = new HashMap<>();
        params.put("organizationId", organizationId);

        if (filter.track() != null) {
            cypher.append(" AND r.track = $track");
            params.put("track", filter.track().name());
        }
        if (filter.status() != null) {
            cypher.append(" AND r.status = $status");
            params.put("status", filter.status().name());
        }
        if (filter.assignedExpertId() != null && !filter.assignedExpertId().isBlank()) {
            List<String> variants = resolveExpertVariants(filter.assignedExpertId().trim());
            cypher.append(" AND r.assignedExpertId IN $expertVariants");
            params.put("expertVariants", variants);
        }
        if (filter.search() != null && !filter.search().isBlank()) {
            cypher.append(" AND (toLower(r.name) CONTAINS toLower($search) OR toLower(r.code) CONTAINS toLower($search) OR (r.baseCode IS NOT NULL AND toLower(r.baseCode) CONTAINS toLower($search)))");
            params.put("search", filter.search().trim());
        }

        cypher.append("\n").append(GRAPH_SKILLS).append("""
                 RETURN r, graphSkills ORDER BY coalesce(r.updatedAt, r.createdAt) DESC, r.name ASC
                """);

        return reads.execute(status -> new ArrayList<>(client.query(cypher.toString()).bindAll(params)
                .fetchAs(TargetRole.class).mappedBy(roleMapper()).all()));
    }

    @Override
    public Optional<TargetRole> findById(String organizationId, TargetRoleId id) {
        Map<String, Object> parameters = Map.of("organizationId", organizationId, "id", id.toString());
        return reads.execute(status -> client.query(BY_ID).bindAll(parameters)
                .fetchAs(TargetRole.class).mappedBy(roleMapper()).first());
    }

    @Override
    public Optional<TargetRole> findByCode(String organizationId, String code) {
        Map<String, Object> parameters = Map.of("organizationId", organizationId, "code", code);
        return reads.execute(status -> client.query(BY_CODE).bindAll(parameters)
                .fetchAs(TargetRole.class).mappedBy(roleMapper()).first());
    }

    @Override
    public void deleteById(String organizationId, TargetRoleId id) {
        Objects.requireNonNull(organizationId, "organizationId");
        String roleId = id.toString();
        writes.executeWithoutResult(status -> roles.detachDelete(organizationId, roleId));
    }

    private BiFunction<TypeSystem, Record, TargetRole> roleMapper() {
        var nodes = nodes();
        return (types, record) -> mapRecordToTargetRole(nodes.apply(types, record.get("r")), record);
    }

    private TargetRole mapRecordToTargetRole(TargetRoleNode node, Record record) {
        List<Object> rawGraphSkills = record.get("graphSkills").asList();
        List<Map<String, Object>> graphSkills = new ArrayList<>();
        for (Object item : rawGraphSkills) {
            if (item instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = (Map<String, Object>) m;
                graphSkills.add(map);
            }
        }
        return mapNodeToTargetRole(node, graphSkills);
    }

    private TargetRole mapNodeToTargetRole(TargetRoleNode node, List<Map<String, Object>> graphSkills) {
        String idStr = node.id() != null ? node.id()
                : (node.code() != null ? node.code() : UUID.randomUUID().toString());
        String orgId = node.organizationId() != null ? node.organizationId() : "comp-technova";
        String code = node.baseCode() != null ? node.baseCode() : (node.code() != null ? node.code() : idStr);
        // Strip synthetic unique suffix if present
        if (code.contains("#")) {
            code = code.substring(0, code.indexOf("#"));
        }

        String name = node.name() != null ? node.name() : (node.title() != null ? node.title() : code);
        String familyCode = node.familyCode() != null ? node.familyCode() : "SOFTWARE_ENGINEERING";
        String trackStr = node.track() != null ? node.track() : "PROFESSIONAL";
        String assignedExpertId = node.assignedExpertId() != null ? node.assignedExpertId() : "";
        String desc = node.description() != null ? node.description() : (node.scope() != null ? node.scope() : "");
        List<String> responsibilities = node.responsibilities() != null ? node.responsibilities() : List.of();
        String statusStr = node.status() != null ? node.status() : "ACTIVE";

        Instant createdAt = node.createdAt() != null ? node.createdAt() : BASELINE;
        Instant updatedAt = node.updatedAt() != null ? node.updatedAt() : createdAt;

        String version = node.version() != null ? node.version() : "1.0";
        String rejectionReason = node.rejectionReason();
        String skillTargets = node.skillTargets() != null ? node.skillTargets().trim() : "";

        // Only fall back to graphSkills if node.skillTargets property is empty or missing
        if (skillTargets.isBlank() || skillTargets.equals("[]")) {
            if (graphSkills != null && !graphSkills.isEmpty()) {
                try {
                    skillTargets = objectMapper.writeValueAsString(graphSkills);
                } catch (Exception ignored) {
                    skillTargets = "[]";
                }
            } else {
                skillTargets = "[]";
            }
        }

        List<String> levels = node.levels() != null ? node.levels() : List.of("Junior", "Middle", "Senior");
        String levelCompetencies = node.levelCompetencies() != null ? node.levelCompetencies().trim() : "{}";
        List<String> competencyIds = node.competencyIds() != null ? node.competencyIds() : List.of();

        return new TargetRole(
                TargetRoleId.fromString(idStr),
                orgId,
                code,
                name,
                familyCode,
                RoleTrack.fromString(trackStr),
                assignedExpertId,
                desc,
                responsibilities,
                RoleStatus.fromString(statusStr),
                version,
                skillTargets,
                createdAt,
                updatedAt,
                rejectionReason,
                levels,
                levelCompetencies,
                competencyIds);
    }

    private List<Map<String, Object>> parseSkillTargetsJson(String json) {
        if (json == null || json.isBlank() || json.trim().equals("[]")) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}