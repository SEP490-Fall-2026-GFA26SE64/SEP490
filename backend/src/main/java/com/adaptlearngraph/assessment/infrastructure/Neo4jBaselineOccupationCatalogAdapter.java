package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort.CatalogOccupation;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort.CatalogOccupationSummary;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort.CatalogRole;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort.CatalogSkill;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort.DependencyUnavailable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.exceptions.Neo4jException;

/** Local read adapter for the isolated ontology 0.8 graph. */
final class Neo4jBaselineOccupationCatalogAdapter implements BaselineOccupationCatalogPort {
    private static final String LIST_QUERY = """
            MATCH (occupation:Occupation)
            WHERE occupation.status = 'ACTIVE'
            OPTIONAL MATCH (occupation)-[membership:HAS_ROLE]->(role:TargetRole)
            WHERE membership.status = 'ACTIVE' AND role.status = 'ACTIVE'
            RETURN occupation.id AS id, occupation.name AS name,
                   occupation.version AS version, count(DISTINCT role) AS roleCount
            ORDER BY toLower(occupation.name), occupation.id
            """;

    private static final String DETAIL_QUERY = """
            MATCH (occupation:Occupation {id: $occupationId})
            WHERE occupation.status = 'ACTIVE'
            OPTIONAL MATCH (occupation)-[membership:HAS_ROLE]->(role:TargetRole)
            WHERE membership.status = 'ACTIVE' AND role.status = 'ACTIVE'
            OPTIONAL MATCH (role)-[roleLevel:HAS_LEVEL]->(level:Level)
                              -[requirement:REQUIRES_SKILL]->(skill:MicroSkill)
            WHERE roleLevel.status = 'ACTIVE' AND level.status = 'ACTIVE'
              AND requirement.status = 'ACTIVE' AND skill.status = 'ACTIVE'
            RETURN occupation.id AS occupationId, occupation.name AS occupationName,
                   occupation.version AS occupationVersion,
                   role.id AS roleId, role.name AS roleName, role.version AS roleVersion,
                   skill.id AS skillId, skill.name AS skillName, skill.version AS skillVersion
            ORDER BY role.id, skill.id
            """;

    private final Driver driver;

    Neo4jBaselineOccupationCatalogAdapter(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "driver must not be null");
    }

    @Override
    public List<CatalogOccupationSummary> findAvailableOccupations(String organizationId) {
        requireText(organizationId, "organizationId");
        try (var session = driver.session()) {
            return session.executeRead(transaction -> transaction.run(LIST_QUERY).list(record ->
                    new CatalogOccupationSummary(
                            record.get("id").asString(), record.get("name").asString(),
                            record.get("version").asString(), record.get("roleCount").asInt())));
        } catch (Neo4jException | IllegalArgumentException failure) {
            throw unavailable(failure);
        }
    }

    @Override
    public Optional<CatalogOccupation> findAvailableOccupation(
            String organizationId, String occupationId) {
        requireText(organizationId, "organizationId");
        String id = requireText(occupationId, "occupationId");
        try (var session = driver.session()) {
            List<Record> records = session.executeRead(transaction ->
                    transaction.run(DETAIL_QUERY, Map.of("occupationId", id)).list());
            if (records.isEmpty()) {
                return Optional.empty();
            }
            Record header = records.getFirst();
            Map<String, RoleAccumulator> roles = new LinkedHashMap<>();
            for (Record record : records) {
                if (record.get("roleId").isNull()) {
                    continue;
                }
                String roleId = record.get("roleId").asString();
                RoleAccumulator role = roles.computeIfAbsent(roleId, ignored -> new RoleAccumulator(
                        roleId, record.get("roleName").asString(), record.get("roleVersion").asString()));
                if (!record.get("skillId").isNull()) {
                    CatalogSkill skill = new CatalogSkill(
                            record.get("skillId").asString(), record.get("skillName").asString(),
                            record.get("skillVersion").asString());
                    role.skills.putIfAbsent(skill.id(), skill);
                }
            }
            return Optional.of(new CatalogOccupation(
                    header.get("occupationId").asString(), header.get("occupationName").asString(),
                    header.get("occupationVersion").asString(), roles.values().stream()
                            .map(RoleAccumulator::toCatalogRole)
                            .toList()));
        } catch (Neo4jException | IllegalArgumentException failure) {
            throw unavailable(failure);
        }
    }

    private static DependencyUnavailable unavailable(RuntimeException cause) {
        return new DependencyUnavailable("Occupation catalog is unavailable", cause);
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.strip();
    }

    private static final class RoleAccumulator {
        private final String id;
        private final String name;
        private final String version;
        private final Map<String, CatalogSkill> skills = new LinkedHashMap<>();

        private RoleAccumulator(String id, String name, String version) {
            this.id = id;
            this.name = name;
            this.version = version;
        }

        private CatalogRole toCatalogRole() {
            return new CatalogRole(id, name, version, new ArrayList<>(skills.values()));
        }
    }
}
