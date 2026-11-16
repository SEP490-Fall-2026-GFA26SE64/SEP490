package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.CompetencyRecord;
import com.adaptlearngraph.entities.domain.CompetencyRecord.MemberSkill;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.neo4j.driver.Record;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jCompetencyRepository implements CompetencyRepository {
    private static final String PROJECTION = """
            OPTIONAL MATCH (l:Level)-[:HAS_COMPETENCY]->(c)
            OPTIONAL MATCH (r:TargetRole)-[:HAS_LEVEL]->(l)
            OPTIONAL MATCH (c)-[:HAS_SKILL]->(s:MicroSkill)
            WITH c,
                 head(collect(DISTINCT l.id)) AS levelId,
                 head(collect(DISTINCT coalesce(l.name, ''))) AS levelName,
                 head(collect(DISTINCT coalesce(r.name, ''))) AS roleName,
                 collect(DISTINCT CASE WHEN s IS NOT NULL THEN {id: s.id, code: coalesce(s.code, s.id), name: s.name} END) AS skills
            RETURN c.id AS id,
                   coalesce(c.code, c.id) AS code,
                   c.name AS name,
                   coalesce(c.description, '') AS description,
                   coalesce(c.attainmentRule, 'ALL_MEMBER_SKILLS_AT_OWNING_LEVEL') AS attainmentRule,
                   coalesce(c.status, 'ACTIVE') AS status,
                   coalesce(c.version, '0.11.0') AS version,
                   levelId,
                   coalesce(levelName, '') AS levelName,
                   coalesce(roleName, '') AS roleName,
                   coalesce(c.departmentId, '') AS departmentId,
                   coalesce(c.departmentName, '') AS departmentName,
                   coalesce(c.jobPositionCode, '') AS jobPositionCode,
                   coalesce(c.jobPositionTitle, '') AS jobPositionTitle,
                   skills,
                   coalesce(toString(c.createdAt), '') AS createdAt,
                   coalesce(toString(c.updatedAt), '') AS updatedAt
            """;
    // Neo4jClient: one statement per list joining the owning level/role and collecting member skills into a row.
    private static final String LIST = """
            MATCH (c:Competency)
            WHERE c.organizationId = $organizationId
              AND ($search IS NULL OR $search = ''
               OR toLower(c.name) CONTAINS toLower($search)
               OR toLower(c.id) CONTAINS toLower($search)
               OR toLower(coalesce(c.code, '')) CONTAINS toLower($search)
               OR toLower(coalesce(c.description, '')) CONTAINS toLower($search))
              AND ($departmentId IS NULL OR $departmentId = '' OR c.departmentId = $departmentId)
              AND ($jobPositionCode IS NULL OR $jobPositionCode = '' OR c.jobPositionCode = $jobPositionCode)
            """ + PROJECTION + """
            ORDER BY coalesce(c.code, c.name) ASC
            """;
    private static final String DETAIL = """
            MATCH (c:Competency {id: $id})
            WHERE c.organizationId = $organizationId
            """ + PROJECTION;

    private final CompetencyNodeRepository competencies;
    private final Neo4jClient client;
    private final TransactionOperations reads;
    private final TransactionTemplate writes;

    public Neo4jCompetencyRepository(CompetencyNodeRepository competencies, Neo4jClient client,
            PlatformTransactionManager transactions) {
        this.competencies = Objects.requireNonNull(competencies, "competencies cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
    }

    @Override
    public List<CompetencyRecord> findAllCompetencies(String organizationId, String search) {
        return findAllCompetencies(organizationId, search, null, null);
    }

    @Override
    public List<CompetencyRecord> findAllCompetencies(String organizationId, String search, String departmentId, String jobPositionCode) {
        Map<String, Object> parameters = Map.of(
                "organizationId", organizationId != null ? organizationId : "",
                "search", search != null ? search.trim() : "",
                "departmentId", departmentId != null ? departmentId.trim() : "",
                "jobPositionCode", jobPositionCode != null ? jobPositionCode.trim() : "");
        return reads.execute(status -> new ArrayList<>(client.query(LIST).bindAll(parameters)
                .fetchAs(CompetencyRecord.class).mappedBy((types, row) -> mapRecord(row)).all()));
    }

    @Override
    public Optional<CompetencyRecord> findById(String organizationId, String id) {
        Map<String, Object> parameters = Map.of(
                "organizationId", organizationId != null ? organizationId : "",
                "id", id);
        return reads.execute(status -> queryById(parameters));
    }

    @Override
    public boolean existsByOrganizationIdAndCode(String organizationId, String code) {
        Objects.requireNonNull(organizationId, "organizationId");
        Objects.requireNonNull(code, "code");
        return Boolean.TRUE.equals(reads.execute(status -> competencies.existsByCode(organizationId, code.trim())));
    }

    @Override
    public boolean existsByOrganizationIdAndCodeAndIdNot(String organizationId, String code, String id) {
        Objects.requireNonNull(organizationId, "organizationId");
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(id, "id");
        return Boolean.TRUE.equals(reads.execute(status -> competencies.existsByCodeAndIdNot(organizationId, code.trim(), id)));
    }

    @Override
    public CompetencyRecord save(String organizationId, CompetencyRecord record, List<String> skillIds, String levelId) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        return writes.execute(status -> {
            Neo4jTenantGuard.requireOwnedOrAbsent(client, "Competency", record.id(), organization);
            competencies.merge(record.id(), organization, record.code(), record.name(), record.description(),
                    record.attainmentRule(), record.status(), record.version(),
                    record.departmentId(), record.departmentName(), record.jobPositionCode(), record.jobPositionTitle());

            if (levelId != null && !levelId.isBlank()) {
                competencies.linkLevel(levelId, Objects.requireNonNull(record.id()), organization);
            }

            if (skillIds != null) {
                if (skillIds.isEmpty()) {
                    competencies.unlinkAllSkills(Objects.requireNonNull(record.id()), organization);
                } else {
                    competencies.unlinkSkillsExcept(Objects.requireNonNull(record.id()), skillIds, organization);
                    competencies.linkSkills(record.id(), skillIds, organization);
                }
            }

            return queryById(Map.of("organizationId", organization, "id", record.id())).orElse(record);
        });
    }

    @Override
    public void deleteById(String organizationId, String id) {
        Objects.requireNonNull(id, "id");
        writes.executeWithoutResult(status -> competencies.detachDelete(organizationId != null ? organizationId : "", id));
    }

    private Optional<CompetencyRecord> queryById(Map<String, Object> parameters) {
        return client.query(DETAIL).bindAll(parameters)
                .fetchAs(CompetencyRecord.class).mappedBy((types, row) -> mapRecord(row)).first();
    }

    private static CompetencyRecord mapRecord(Record record) {
        List<MemberSkill> skills = new ArrayList<>();
        var rawSkills = record.get("skills").asList();
        for (var obj : rawSkills) {
            if (obj instanceof Map<?, ?> map) {
                String sId = Objects.toString(map.get("id"), "");
                String sCode = Objects.toString(map.get("code"), "");
                String sName = Objects.toString(map.get("name"), "");
                if (!sId.isBlank() || !sCode.isBlank()) {
                    skills.add(new MemberSkill(sId, sCode, sName));
                }
            }
        }

        String code = record.containsKey("code") && !record.get("code").isNull()
                ? record.get("code").asString()
                : record.get("id").asString();

        return new CompetencyRecord(
                record.get("id").asString(),
                code,
                record.get("name").asString(),
                record.get("description").asString(),
                record.get("attainmentRule").asString(),
                record.get("status").asString(),
                record.get("version").asString(),
                record.containsKey("levelId") && !record.get("levelId").isNull() ? record.get("levelId").asString() : null,
                record.get("levelName").asString(),
                record.get("roleName").asString(),
                record.containsKey("departmentId") && !record.get("departmentId").isNull() ? record.get("departmentId").asString() : "",
                record.containsKey("departmentName") && !record.get("departmentName").isNull() ? record.get("departmentName").asString() : "",
                record.containsKey("jobPositionCode") && !record.get("jobPositionCode").isNull() ? record.get("jobPositionCode").asString() : "",
                record.containsKey("jobPositionTitle") && !record.get("jobPositionTitle").isNull() ? record.get("jobPositionTitle").asString() : "",
                skills,
                record.containsKey("createdAt") && !record.get("createdAt").isNull() ? record.get("createdAt").asString() : "",
                record.containsKey("updatedAt") && !record.get("updatedAt").isNull() ? record.get("updatedAt").asString() : ""
        );
    }
}
