package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.Occupation;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.neo4j.driver.Record;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jOccupationRepository implements OccupationRepository {
    private static final String PROJECTION = """
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
    // Neo4jClient: one aggregate statement per list (role and micro-skill counts), mapped to a non-entity row.
    private static final String LIST = """
            MATCH (o:Occupation)
            WHERE o.organizationId = $organizationId
            """ + PROJECTION + """
            ORDER BY o.code ASC
            """;
    private static final String DETAIL = """
            MATCH (o:Occupation)
            WHERE o.organizationId = $organizationId
              AND (o.id = $idOrCode OR o.code = $idOrCode)
            """ + PROJECTION;

    private final OccupationNodeRepository occupations;
    private final Neo4jClient client;
    private final TransactionTemplate reads;
    private final TransactionTemplate writes;

    public Neo4jOccupationRepository(OccupationNodeRepository occupations, Neo4jClient client,
            PlatformTransactionManager transactions) {
        this.occupations = Objects.requireNonNull(occupations, "occupations cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.readOnly(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
    }

    @Override
    public List<Occupation> findAllOccupations(String organizationId) {
        return reads.execute(status -> new ArrayList<>(client.query(LIST)
                .bindAll(Map.of("organizationId", organizationId != null ? organizationId : ""))
                .fetchAs(Occupation.class).mappedBy((types, row) -> toOccupation(row)).all()));
    }

    @Override
    public Optional<Occupation> findByIdOrCode(String organizationId, String idOrCode) {
        Map<String, Object> parameters = Map.of(
                "organizationId", organizationId != null ? organizationId : "",
                "idOrCode", idOrCode);
        return reads.execute(status -> client.query(DETAIL).bindAll(parameters)
                .fetchAs(Occupation.class).mappedBy((types, row) -> toOccupation(row)).first());
    }

    @Override
    public Occupation save(String organizationId, Occupation o) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        String id = o.id() != null && !o.id().isBlank() ? o.id()
                : UUID.nameUUIDFromBytes((organization + ":occupation:" + o.code()).getBytes(StandardCharsets.UTF_8)).toString();
        writes.executeWithoutResult(status -> {
            Neo4jTenantGuard.requireOwnedOrAbsent(client, "Occupation", id, organization);
            occupations.merge(id, organization, o.code(), o.name(), o.jobZone() > 0 ? o.jobZone() : 4,
                    o.interestRealistic(), o.interestInvestigative(), o.interestArtistic(), o.interestSocial(),
                    o.interestEnterprising(), o.interestConventional(),
                    o.status() != null ? o.status() : "ACTIVE", o.version() != null ? o.version() : "0.9.0");
        });
        return o;
    }

    @Override
    public void delete(String organizationId, String idOrCode) {
        Objects.requireNonNull(idOrCode, "idOrCode");
        writes.executeWithoutResult(status ->
                occupations.deleteByIdOrCode(organizationId != null ? organizationId : "", idOrCode));
    }

    private static Occupation toOccupation(Record row) {
        return new Occupation(
                row.get("id").asString(),
                row.get("code").asString(),
                row.get("name").asString(),
                row.get("jobZone").asInt(),
                row.get("interestRealistic").asDouble(),
                row.get("interestInvestigative").asDouble(),
                row.get("interestArtistic").asDouble(),
                row.get("interestSocial").asDouble(),
                row.get("interestEnterprising").asDouble(),
                row.get("interestConventional").asDouble(),
                row.get("status").asString(),
                row.get("version").asString(),
                row.get("roleCount").asInt(),
                row.get("microSkillCount").asInt());
    }
}