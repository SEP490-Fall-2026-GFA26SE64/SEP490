package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.application.port.out.OccupationRepository;
import com.adaptlearngraph.catalog.domain.Occupation;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class Neo4jOccupationRepository implements OccupationRepository {
    private final Driver driver;

    public Neo4jOccupationRepository(Driver driver) {
        this.driver = Objects.requireNonNull(driver, "Driver cannot be null");
    }

    @Override
    public List<Occupation> findAllOccupations() {
        return queryOccupations(null);
    }

    @Override
    public List<Occupation> findAllOccupations(String organizationId) {
        return queryOccupations(organizationId);
    }

    private List<Occupation> queryOccupations(String organizationId) {
        String cypher = """
                MATCH (o:Occupation)
                WHERE ($organizationId IS NULL OR $organizationId = '' OR o.organizationId = $organizationId)
                OPTIONAL MATCH (o)-[:HAS_ROLE]->(r:TargetRole)
                OPTIONAL MATCH (r)-[:HAS_LEVEL]->(l:Level)-[:REQUIRES_SKILL]->(s:MicroSkill)
                RETURN o.id AS id,
                       o.code AS code,
                       o.name AS name,
                       coalesce(o.jobZone, 4) AS jobZone,
                       coalesce(o.interestRealistic, 0.0) AS interestRealistic,
                       coalesce(o.interestInvestigative, 0.0) AS interestInvestigative,
                       coalesce(o.interestArtistic, 0.0) AS interestArtistic,
                       coalesce(o.interestSocial, 0.0) AS interestSocial,
                       coalesce(o.interestEnterprising, 0.0) AS interestEnterprising,
                       coalesce(o.interestConventional, 0.0) AS interestConventional,
                       coalesce(o.status, 'ACTIVE') AS status,
                       coalesce(o.version, '0.9.0') AS version,
                       count(DISTINCT r) AS roleCount,
                       count(DISTINCT s) AS microSkillCount
                ORDER BY o.code ASC
                """;

        try (var session = driver.session()) {
            var result = session.run(cypher, java.util.Map.of("organizationId", organizationId != null ? organizationId : ""));
            List<Occupation> occupations = new ArrayList<>();
            while (result.hasNext()) {
                Record record = result.next();
                occupations.add(new Occupation(
                        record.get("id").asString(),
                        record.get("code").asString(),
                        record.get("name").asString(),
                        record.get("jobZone").asInt(),
                        record.get("interestRealistic").asDouble(),
                        record.get("interestInvestigative").asDouble(),
                        record.get("interestArtistic").asDouble(),
                        record.get("interestSocial").asDouble(),
                        record.get("interestEnterprising").asDouble(),
                        record.get("interestConventional").asDouble(),
                        record.get("status").asString(),
                        record.get("version").asString(),
                        record.get("roleCount").asInt(),
                        record.get("microSkillCount").asInt()
                ));
            }
            return occupations;
        }
    }

    @Override
    public java.util.Optional<Occupation> findByIdOrCode(String idOrCode) {
        return findByIdOrCode(null, idOrCode);
    }

    @Override
    public java.util.Optional<Occupation> findByIdOrCode(String organizationId, String idOrCode) {
        String cypher = """
                MATCH (o:Occupation)
                WHERE ($organizationId IS NULL OR $organizationId = '' OR o.organizationId = $organizationId)
                  AND (o.id = $idOrCode OR o.code = $idOrCode)
                OPTIONAL MATCH (o)-[:HAS_ROLE]->(r:TargetRole)
                OPTIONAL MATCH (r)-[:HAS_LEVEL]->(l:Level)-[:REQUIRES_SKILL]->(s:MicroSkill)
                RETURN o.id AS id,
                       o.code AS code,
                       o.name AS name,
                       coalesce(o.jobZone, 4) AS jobZone,
                       coalesce(o.interestRealistic, 0.0) AS interestRealistic,
                       coalesce(o.interestInvestigative, 0.0) AS interestInvestigative,
                       coalesce(o.interestArtistic, 0.0) AS interestArtistic,
                       coalesce(o.interestSocial, 0.0) AS interestSocial,
                       coalesce(o.interestEnterprising, 0.0) AS interestEnterprising,
                       coalesce(o.interestConventional, 0.0) AS interestConventional,
                       coalesce(o.status, 'ACTIVE') AS status,
                       coalesce(o.version, '0.9.0') AS version,
                       count(DISTINCT r) AS roleCount,
                       count(DISTINCT s) AS microSkillCount
                """;
        try (var session = driver.session()) {
            var result = session.run(cypher, java.util.Map.of(
                    "organizationId", organizationId != null ? organizationId : "",
                    "idOrCode", idOrCode));
            if (result.hasNext()) {
                Record record = result.next();
                return java.util.Optional.of(new Occupation(
                        record.get("id").asString(),
                        record.get("code").asString(),
                        record.get("name").asString(),
                        record.get("jobZone").asInt(),
                        record.get("interestRealistic").asDouble(),
                        record.get("interestInvestigative").asDouble(),
                        record.get("interestArtistic").asDouble(),
                        record.get("interestSocial").asDouble(),
                        record.get("interestEnterprising").asDouble(),
                        record.get("interestConventional").asDouble(),
                        record.get("status").asString(),
                        record.get("version").asString(),
                        record.get("roleCount").asInt(),
                        record.get("microSkillCount").asInt()
                ));
            }
            return java.util.Optional.empty();
        }
    }

    @Override
    public Occupation save(Occupation o) {
        return save(null, o);
    }

    @Override
    public Occupation save(String organizationId, Occupation o) {
        String cypher = """
                MERGE (o:Occupation {code: $code})
                ON CREATE SET
                    o.id = coalesce($id, $code),
                    o.organizationId = $organizationId,
                    o.code = $code,
                    o.name = $name,
                    o.jobZone = $jobZone,
                    o.interestRealistic = $interestRealistic,
                    o.interestInvestigative = $interestInvestigative,
                    o.interestArtistic = $interestArtistic,
                    o.interestSocial = $interestSocial,
                    o.interestEnterprising = $interestEnterprising,
                    o.interestConventional = $interestConventional,
                    o.status = $status,
                    o.version = $version
                ON MATCH SET
                    o.organizationId = coalesce(o.organizationId, $organizationId),
                    o.name = $name,
                    o.jobZone = $jobZone,
                    o.interestRealistic = $interestRealistic,
                    o.interestInvestigative = $interestInvestigative,
                    o.interestArtistic = $interestArtistic,
                    o.interestSocial = $interestSocial,
                    o.interestEnterprising = $interestEnterprising,
                    o.interestConventional = $interestConventional,
                    o.status = $status,
                    o.version = $version
                RETURN o.id AS id
                """;
        java.util.Map<String, Object> params = new java.util.HashMap<>();
        params.put("id", o.id() != null ? o.id() : o.code());
        params.put("organizationId", organizationId != null ? organizationId : "");
        params.put("code", o.code());
        params.put("name", o.name());
        params.put("jobZone", o.jobZone() > 0 ? o.jobZone() : 4);
        params.put("interestRealistic", o.interestRealistic());
        params.put("interestInvestigative", o.interestInvestigative());
        params.put("interestArtistic", o.interestArtistic());
        params.put("interestSocial", o.interestSocial());
        params.put("interestEnterprising", o.interestEnterprising());
        params.put("interestConventional", o.interestConventional());
        params.put("status", o.status() != null ? o.status() : "ACTIVE");
        params.put("version", o.version() != null ? o.version() : "0.9.0");

        try (var session = driver.session()) {
            session.run(cypher, params).consume();
            return o;
        }
    }

    @Override
    public void delete(String idOrCode) {
        delete(null, idOrCode);
    }

    @Override
    public void delete(String organizationId, String idOrCode) {
        String cypher = """
                MATCH (o:Occupation)
                WHERE ($organizationId IS NULL OR $organizationId = '' OR o.organizationId = $organizationId)
                  AND (o.id = $idOrCode OR o.code = $idOrCode)
                DETACH DELETE o
                """;
        try (var session = driver.session()) {
            session.run(cypher, java.util.Map.of(
                    "organizationId", organizationId != null ? organizationId : "",
                    "idOrCode", idOrCode)).consume();
        }
    }
}

