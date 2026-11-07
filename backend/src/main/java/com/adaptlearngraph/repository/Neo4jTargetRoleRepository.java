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
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jTargetRoleRepository implements TargetRoleRepository {
    private static final Instant BASELINE = Instant.parse("2026-01-01T00:00:00Z");
    private static final String GRAPH_RELATIONS = """
            OPTIONAL MATCH (r)-[:HAS_LEVEL]->(l:Level)
            WITH r, l ORDER BY coalesce(l.rank, 999) ASC, l.name ASC
            WITH r, [x IN collect(DISTINCT CASE WHEN l IS NOT NULL THEN l.name END) WHERE x IS NOT NULL] AS graphLevels,
                    [x IN collect(DISTINCT CASE WHEN l IS NOT NULL THEN { name: l.name, duration: coalesce(l.duration, '') } END) WHERE x IS NOT NULL] AS graphLevelDetails
            OPTIONAL MATCH (r)-[req:REQUIRES_SKILL]->(s:MicroSkill)
            WITH r, graphLevels, graphLevelDetails, [x IN collect(DISTINCT CASE WHEN s IS NOT NULL THEN {
                skillId: s.id,
                skillCode: s.code,
                skillName: s.name,
                threshold: toInteger(round(coalesce(req.targetMastery, req.requiredScore, 0.7) * 100)),
                level: coalesce(req.level, '')
            } END) WHERE x IS NOT NULL] AS directSkills
            OPTIONAL MATCH (r)-[:HAS_LEVEL]->(lvl:Level)-[lreq:REQUIRES_SKILL]->(ls:MicroSkill)
            WITH r, graphLevels, graphLevelDetails, directSkills, [x IN collect(DISTINCT CASE WHEN ls IS NOT NULL THEN {
                skillId: ls.id,
                skillCode: ls.code,
                skillName: ls.name,
                threshold: toInteger(round(coalesce(lreq.targetMastery, lreq.requiredScore, 0.7) * 100)),
                level: coalesce(lreq.level, lvl.name, '')
            } END) WHERE x IS NOT NULL] AS levelSkills
            WITH r, graphLevels, graphLevelDetails, CASE WHEN size(directSkills) > 0 THEN directSkills ELSE levelSkills END AS graphSkills
            """;
    // Neo4jClient: the role node is mapped by SDN; its HAS_LEVEL and REQUIRES_SKILL targets are collected.
    private static final String BY_ID = """
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId
              AND (r.id = $id
                   OR r.code = $id
                   OR r.baseCode = $id
                   OR (r.baseCode IS NOT NULL AND $id STARTS WITH r.baseCode AND coalesce(r.version, '1.0') = substring($id, size(r.baseCode) + 2, 3))
                   OR (r.baseCode IS NOT NULL AND $id CONTAINS r.baseCode AND (r.version IS NOT NULL AND $id CONTAINS r.version)))
              AND coalesce(r.status, 'ACTIVE') <> 'SUPERSEDED'
            """ + GRAPH_RELATIONS + """
            RETURN r, graphSkills, graphLevels, graphLevelDetails
            """;
    private static final String BY_CODE = """
            MATCH (r:TargetRole)
            WHERE r.organizationId = $organizationId AND (r.code = $code OR r.baseCode = $code)
            """ + GRAPH_RELATIONS + """
            RETURN r, graphSkills, graphLevels, graphLevelDetails
            """;

    private final TargetRoleNodeRepository roles;
    private final Neo4jClient client;
    private final Neo4jMappingContext mappingContext;
    private final TransactionOperations reads;
    private final TransactionTemplate writes;
    private final ObjectMapper objectMapper;

    public Neo4jTargetRoleRepository(TargetRoleNodeRepository roles, Neo4jClient client, Neo4jMappingContext mappingContext,
            PlatformTransactionManager transactions) {
        this.roles = Objects.requireNonNull(roles, "roles cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.mappingContext = Objects.requireNonNull(mappingContext, "mapping context cannot be null");
        mappingContext.getRequiredPersistentEntity(TargetRoleNode.class);
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
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
                    targetRole.getStatus().name(), version, targetRole.getSkillTargets(),
                    targetRole.getLevelCompetencies(),
                    targetRole.getCompetencyIds() != null ? targetRole.getCompetencyIds() : List.of(),
                    targetRole.getCreatedAt().toString(), updatedAt, targetRole.getRejectionReason());

            // When publishing, override and supersede any previous version of this role
            if (targetRole.getStatus() == RoleStatus.PUBLISHED || targetRole.getStatus() == RoleStatus.ACTIVE) {
                roles.supersedeOtherVersions(organizationId, matchedId, targetRole.getName(), rawCode, graphCode, updatedAt);
            }

            // 1. Synchronize Level nodes and HAS_LEVEL edges (stored strictly in Level nodes, NOT in TargetRole)
            syncLevels(organizationId, matchedId, targetRole.getLevels(), targetRole.getLevelDurations(), targetRole.getUpdatedAt(), version);

            // 2. Synchronize HAS_COMPETENCY edges from Level nodes to Competencies
            syncLevelCompetencies(organizationId, matchedId, targetRole.getLevelCompetencies(), targetRole.getCompetencyIds());

            // 3. Synchronize REQUIRES_SKILL graph edges (both on TargetRole and on Level nodes)
            syncSkillRelationships(organizationId, matchedId, targetRole.getSkillTargets(), targetRole.getUpdatedAt());

            // 4. Synchronize HAS_ROLE edge from JobPosition to TargetRole
            syncJobPositionRelationship(organizationId, matchedId, targetRole.getFamilyCode(), targetRole.getStatus().name(), targetRole.getUpdatedAt());
        });
        return targetRole;
    }

    private void syncLevels(String organizationId, String roleId, List<String> levels, Map<String, String> levelDurations, Instant updatedAt, String version) {
        List<String> levelList = (levels != null && !levels.isEmpty()) ? levels : List.of("Senior", "Middle", "Junior");
        List<Map<String, Object>> levelItems = new ArrayList<>();
        List<String> newLevelIds = new ArrayList<>();

        Map<String, String> existingIdsByName = new HashMap<>();
        Map<Long, String> existingIdsByRank = new HashMap<>();
        client.query("""
                MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)
                WHERE r.organizationId = $organizationId
                RETURN l.id AS id, l.name AS name, l.rank AS rank
                """)
                .bind(roleId).to("roleId")
                .bind(organizationId).to("organizationId")
                .fetch().all().forEach(row -> {
                    Object idObj = row.get("id");
                    if (idObj != null) {
                        String existingId = idObj.toString();
                        Object nameObj = row.get("name");
                        if (nameObj != null) existingIdsByName.put(nameObj.toString().trim().toLowerCase(), existingId);
                        Object rankObj = row.get("rank");
                        if (rankObj instanceof Number n) existingIdsByRank.put(n.longValue(), existingId);
                    }
                });

        for (int i = 0; i < levelList.size(); i++) {
            long rank = i + 1;
            String name = levelList.get(i).trim();
            if (name.isBlank()) continue;
            String levelId = existingIdsByName.get(name.toLowerCase());
            if (levelId == null || newLevelIds.contains(levelId)) {
                String byRank = existingIdsByRank.get(rank);
                levelId = (byRank != null && !newLevelIds.contains(byRank)) ? byRank : (roleId + "_LV_" + rank);
            }
            newLevelIds.add(levelId);

            String code;
            if (name.equalsIgnoreCase("Senior")) code = "S";
            else if (name.equalsIgnoreCase("Middle")) code = "M";
            else if (name.equalsIgnoreCase("Junior")) code = "J";
            else code = "LV-" + rank;

            String duration = null;
            if (levelDurations != null) {
                duration = levelDurations.get(name);
                if (duration == null) {
                    duration = levelDurations.get(String.valueOf(rank));
                }
            }
            if (duration == null || duration.isBlank()) {
                if (name.equalsIgnoreCase("Senior") || rank == 1) duration = "6 months";
                else if (name.equalsIgnoreCase("Middle") || rank == 2) duration = "4 months";
                else if (name.equalsIgnoreCase("Junior") || rank == 3) duration = "3 months";
                else duration = "2 months";
            }

            Map<String, Object> item = new HashMap<>();
            item.put("id", levelId);
            item.put("name", name);
            item.put("code", code);
            item.put("rank", rank);
            item.put("duration", duration.trim());
            levelItems.add(item);
        }

        // Delete HAS_LEVEL edges and orphan Level nodes that are no longer part of this role
        client.query("""
                MATCH (r:TargetRole {id: $roleId})-[hl:HAS_LEVEL]->(l:Level)
                WHERE r.organizationId = $organizationId AND NOT l.id IN $newLevelIds
                DETACH DELETE l
                """)
                .bind(roleId).to("roleId")
                .bind(organizationId).to("organizationId")
                .bind(newLevelIds).to("newLevelIds")
                .run();

        // Merge Level nodes and HAS_LEVEL edges
        if (!levelItems.isEmpty()) {
            client.query("""
                    UNWIND $levelItems AS item
                    MATCH (r:TargetRole {id: $roleId}) WHERE r.organizationId = $organizationId
                    MERGE (l:Level {id: item.id})
                    ON CREATE SET
                        l.organizationId = $organizationId,
                        l.name = item.name,
                        l.code = item.code,
                        l.rank = item.rank,
                        l.duration = item.duration,
                        l.status = 'ACTIVE',
                        l.version = $version,
                        l.attainmentRule = 'ALL_MANDATORY_SKILLS',
                        l.createdAt = datetime($updatedAt),
                        l.updatedAt = datetime($updatedAt)
                    ON MATCH SET
                        l.name = item.name,
                        l.code = item.code,
                        l.rank = item.rank,
                        l.duration = item.duration,
                        l.organizationId = $organizationId,
                        l.status = 'ACTIVE',
                        l.version = coalesce(l.version, $version),
                        l.updatedAt = datetime($updatedAt)
                    MERGE (r)-[hl:HAS_LEVEL]->(l)
                    ON CREATE SET hl.id = $roleId + '_HL_' + item.rank, hl.version = $version, hl.status = 'ACTIVE', hl.createdAt = datetime($updatedAt)
                    SET hl.id = coalesce(hl.id, $roleId + '_HL_' + item.rank),
                        hl.version = coalesce(hl.version, $version),
                        hl.status = 'ACTIVE',
                        hl.updatedAt = datetime($updatedAt)
                    """)
                    .bind(roleId).to("roleId")
                    .bind(organizationId).to("organizationId")
                    .bind(version).to("version")
                    .bind(updatedAt.toString()).to("updatedAt")
                    .bind(levelItems).to("levelItems")
                    .run();
        }
    }

    private void syncLevelCompetencies(String organizationId, String roleId, String levelCompetenciesJson, List<String> fallbackCompIds) {
        // First delete existing HAS_COMPETENCY from this role's levels
        client.query("""
                MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)-[rc:HAS_COMPETENCY]->(:Competency)
                WHERE r.organizationId = $organizationId
                DELETE rc
                """)
                .bind(roleId).to("roleId")
                .bind(organizationId).to("organizationId")
                .run();

        Map<String, List<String>> levelCompMap = parseLevelCompetenciesJson(levelCompetenciesJson);
        if (levelCompMap != null && !levelCompMap.isEmpty()) {
            for (Map.Entry<String, List<String>> entry : levelCompMap.entrySet()) {
                String levelName = entry.getKey();
                List<String> compIds = entry.getValue();
                if (compIds == null || compIds.isEmpty()) continue;

                client.query("""
                        UNWIND $compIds AS cid
                        MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)
                        WHERE r.organizationId = $organizationId AND toLower(l.name) = toLower($levelName)
                        MATCH (c:Competency)
                        WHERE (c.organizationId IS NULL OR c.organizationId = $organizationId)
                          AND (c.id = cid OR c.code = cid OR toLower(c.id) = toLower(cid) OR toLower(coalesce(c.code, '')) = toLower(cid))
                        MERGE (l)-[rc:HAS_COMPETENCY]->(c)
                        ON CREATE SET rc.status = 'ACTIVE', rc.version = '0.11.0'
                        """)
                        .bind(roleId).to("roleId")
                        .bind(organizationId).to("organizationId")
                        .bind(levelName).to("levelName")
                        .bind(compIds).to("compIds")
                        .run();
            }
        } else if (fallbackCompIds != null && !fallbackCompIds.isEmpty()) {
            client.query("""
                    UNWIND $compIds AS cid
                    MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)
                    WHERE r.organizationId = $organizationId
                    MATCH (c:Competency)
                    WHERE (c.organizationId IS NULL OR c.organizationId = $organizationId)
                      AND (c.id = cid OR c.code = cid OR toLower(c.id) = toLower(cid) OR toLower(coalesce(c.code, '')) = toLower(cid))
                    MERGE (l)-[rc:HAS_COMPETENCY]->(c)
                    ON CREATE SET rc.status = 'ACTIVE', rc.version = '0.11.0'
                    """)
                    .bind(roleId).to("roleId")
                    .bind(organizationId).to("organizationId")
                    .bind(fallbackCompIds).to("compIds")
                    .run();
        }
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
                String level = Objects.toString(item.get("level"), "").trim();
                skillData.put("level", level);
                Number threshold = 70;
                if (item.get("threshold") instanceof Number n) {
                    threshold = n;
                }
                skillData.put("threshold", threshold.intValue());
                processedSkills.add(skillData);
            }
        }

        // 1. Merge current REQUIRES_SKILL edges distinguishing per-level assignments when skills are provided
        if (!processedSkills.isEmpty()) {
            roles.deleteRequiredSkills(roleId, organizationId);
            client.query("""
                    MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)-[req:REQUIRES_SKILL]->()
                    WHERE r.organizationId = $organizationId
                    DELETE req
                    """)
                    .bind(roleId).to("roleId")
                    .bind(organizationId).to("organizationId")
                    .run();

            roles.mergeRequiredSkills(organizationId, roleId, processedSkills, updatedAt.toString());

            // Also link Level -> REQUIRES_SKILL -> MicroSkill per schema contract
            client.query("""
                    UNWIND $skills AS item
                    MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)
                    WHERE r.organizationId = $organizationId
                      AND (item.level = '' OR toLower(l.name) = toLower(item.level))
                    MATCH (s:MicroSkill)
                    WHERE (s.organizationId IS NULL OR s.organizationId = $organizationId)
                      AND (s.id = item.skillId OR s.code = item.skillCode OR s.id = item.skillCode
                           OR toLower(s.id) = toLower(item.skillCode) OR toLower(s.code) = toLower(item.skillCode)
                           OR toLower(s.id) = toLower(item.skillId))
                    WITH DISTINCT l, s, item
                    MERGE (l)-[req:REQUIRES_SKILL]->(s)
                    ON CREATE SET req.createdAt = datetime($updatedAt),
                                  req.id = l.id + '_REQ_' + s.id,
                                  req.version = coalesce(l.version, '0.12.0')
                    SET req.id = coalesce(req.id, l.id + '_REQ_' + s.id),
                        req.version = coalesce(req.version, l.version, '0.12.0'),
                        req.targetMastery = toFloat(item.threshold) / 100.0,
                        req.requiredScore = toFloat(item.threshold) / 100.0,
                        req.isMandatory = coalesce(req.isMandatory, true),
                        req.status = 'ACTIVE',
                        req.updatedAt = datetime($updatedAt)
                    """)
                    .bind(roleId).to("roleId")
                    .bind(organizationId).to("organizationId")
                    .bind(processedSkills).to("skills")
                    .bind(updatedAt.toString()).to("updatedAt")
                    .run();

            // Also link Competency -> HAS_SKILL -> MicroSkill if level has competencies
            client.query("""
                    MATCH (r:TargetRole {id: $roleId})-[:HAS_LEVEL]->(l:Level)-[:HAS_COMPETENCY]->(c:Competency)
                    MATCH (l)-[:REQUIRES_SKILL]->(s:MicroSkill)
                    WHERE (c.organizationId IS NULL OR c.organizationId = $organizationId)
                    WITH DISTINCT c, s
                    MERGE (c)-[hs:HAS_SKILL]->(s)
                    ON CREATE SET hs.status = 'ACTIVE', hs.version = '0.11.0'
                    """)
                    .bind(roleId).to("roleId")
                    .bind(organizationId).to("organizationId")
                    .run();
        }
    }

    private void syncJobPositionRelationship(String organizationId, String roleId, String familyCode, String status, Instant updatedAt) {
        String famCode = familyCode != null ? familyCode.trim().toUpperCase() : "DEV";
        client.query("""
                MATCH (r:TargetRole {id: $roleId})
                MATCH (jp:JobPosition)
                WHERE jp.status = 'ACTIVE'
                  AND (
                    jp.code = $famCode
                    OR jp.id = $famCode
                    OR jp.id = 'OCC-' + $famCode
                    OR ($famCode IN ['DEV', 'JAVA_BACKEND', 'SOFTWARE_ENGINEERING', 'SOFTWARE_DEVELOPMENT', '15-1252.00', '15-1252'] AND jp.code = '15-1252.00')
                    OR ($famCode IN ['DATA', 'DATABASE', '15-1243.00', '15-1243'] AND jp.code = '15-1243.00')
                    OR ($famCode IN ['QA', 'QUALITY', 'TEST', '15-1253.00', '15-1253'] AND jp.code = '15-1253.00')
                    OR ($famCode IN ['CLOUD', 'DEVOPS', 'SYSTEMS', 'INFRASTRUCTURE', '15-1299.08'] AND jp.code = '15-1299.08')
                    OR ($famCode IN ['SECURITY', 'SEC', 'COMPLIANCE', '15-1212.00'] AND jp.code = '15-1212.00')
                  )
                MERGE (jp)-[rel:HAS_ROLE]->(r)
                SET rel.status = CASE WHEN $status IN ['PUBLISHED', 'ACTIVE'] THEN 'ACTIVE' ELSE 'INACTIVE' END,
                    rel.updatedAt = datetime($updatedAt)
                """)
                .bind(roleId).to("roleId")
                .bind(famCode).to("famCode")
                .bind(status).to("status")
                .bind(updatedAt.toString()).to("updatedAt")
                .run();
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

        cypher.append("\n").append(GRAPH_RELATIONS).append("""
                 RETURN r, graphSkills, graphLevels, graphLevelDetails ORDER BY coalesce(r.updatedAt, r.createdAt) DESC, r.name ASC
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
        writes.executeWithoutResult(status -> {
            client.query("""
                    MATCH (r:TargetRole {id: $roleId})-[hl:HAS_LEVEL]->(l:Level)
                    WHERE r.organizationId = $organizationId
                    DETACH DELETE l
                    """)
                    .bind(roleId).to("roleId")
                    .bind(organizationId).to("organizationId")
                    .run();
            roles.detachDelete(organizationId, roleId);
        });
    }

    private BiFunction<TypeSystem, Record, TargetRole> roleMapper() {
        var nodes = nodes();
        return (types, record) -> {
            TargetRoleNode node = nodes.apply(types, record.get("r"));
            return mapRecordToTargetRole(node, record);
        };
    }

    private TargetRole mapRecordToTargetRole(TargetRoleNode node, Record record) {
        List<Object> rawGraphSkills = record.containsKey("graphSkills") && !record.get("graphSkills").isNull()
                ? record.get("graphSkills").asList()
                : List.of();
        List<Map<String, Object>> graphSkills = new ArrayList<>();
        for (Object item : rawGraphSkills) {
            if (item instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = (Map<String, Object>) m;
                graphSkills.add(map);
            }
        }
        List<String> graphLevels = new ArrayList<>();
        if (record.containsKey("graphLevels") && !record.get("graphLevels").isNull()) {
            for (Object lvl : record.get("graphLevels").asList()) {
                if (lvl != null && !lvl.toString().isBlank()) {
                    graphLevels.add(lvl.toString());
                }
            }
        }
        Map<String, String> levelDurations = new HashMap<>();
        if (record.containsKey("graphLevelDetails") && !record.get("graphLevelDetails").isNull()) {
            for (Object detail : record.get("graphLevelDetails").asList()) {
                if (detail instanceof Map<?, ?> m) {
                    Object nameObj = m.get("name");
                    Object durObj = m.get("duration");
                    if (nameObj != null && durObj != null && !durObj.toString().isBlank()) {
                        levelDurations.put(nameObj.toString(), durObj.toString());
                    }
                }
            }
        }
        return mapNodeToTargetRole(node, graphSkills, graphLevels, levelDurations);
    }

    private TargetRole mapNodeToTargetRole(TargetRoleNode node, List<Map<String, Object>> graphSkills, List<String> graphLevels, Map<String, String> levelDurations) {
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

        List<String> levels = (graphLevels != null && !graphLevels.isEmpty())
                ? graphLevels
                : List.of("Senior", "Middle", "Junior");
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
                competencyIds,
                levelDurations);
    }

    private Map<String, List<String>> parseLevelCompetenciesJson(String json) {
        if (json == null || json.isBlank() || json.trim().equals("{}")) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, List<String>>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
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