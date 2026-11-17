package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.entities.domain.JobPositionChange;
import com.adaptlearngraph.entities.domain.CatalogFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
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

public class Neo4jJobPositionRepository implements JobPositionRepository {
    private static final String PROJECTION = """
            OPTIONAL MATCH (o)-[:HAS_ROLE]->(r:TargetRole)
            OPTIONAL MATCH (r)-[:HAS_LEVEL]->(l:Level)-[:REQUIRES_SKILL]->(s:MicroSkill)
            RETURN o.id AS id,
                   o.code AS code,
                   o.name AS name,
                   coalesce(o.jobZone, 4) AS jobZone,
                   coalesce(o.status, 'ACTIVE') AS status,
                   coalesce(o.version, '0.9.0') AS version,
                   count(DISTINCT r) AS roleCount,
                   count(DISTINCT s) AS microSkillCount,
                   o.description AS description,
                   o.interestRealistic AS interestRealistic,o.interestInvestigative AS interestInvestigative,
                   o.interestArtistic AS interestArtistic,o.interestSocial AS interestSocial,
                   o.interestEnterprising AS interestEnterprising,o.interestConventional AS interestConventional
            """;

    private static final String LIST = """
            MATCH (o:JobPosition)
            WHERE o.organizationId = $organizationId
            """ + PROJECTION + """
            ORDER BY o.code ASC
            """;
    private static final String DETAIL = """
            MATCH (o:JobPosition)
            WHERE o.organizationId = $organizationId
              AND (o.id = $idOrCode OR o.code = $idOrCode)
            """ + PROJECTION;

    private final JobPositionNodeRepository jobPositions;
    private final Neo4jClient client;
    private final TransactionOperations reads;
    private final TransactionTemplate writes;
    private final ObjectMapper json;

    public Neo4jJobPositionRepository(JobPositionNodeRepository jobPositions, Neo4jClient client,
            PlatformTransactionManager transactions) {
        this(jobPositions, client, transactions, new ObjectMapper().findAndRegisterModules());
    }
    public Neo4jJobPositionRepository(JobPositionNodeRepository jobPositions, Neo4jClient client,
            PlatformTransactionManager transactions, ObjectMapper json) {
        this.jobPositions = Objects.requireNonNull(jobPositions, "jobPositions cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
        this.json = json;
    }

    @Override
    public List<JobPosition> findAllJobPositions(String organizationId) {
        return reads.execute(status -> new ArrayList<>(client.query(LIST)
                .bindAll(Map.of("organizationId", organizationId != null ? organizationId : ""))
                .fetchAs(JobPosition.class).mappedBy((types, row) -> toJobPosition(row)).all()));
    }

    @Override
    public Optional<JobPosition> findByIdOrCode(String organizationId, String idOrCode) {
        Map<String, Object> parameters = Map.of(
                "organizationId", organizationId != null ? organizationId : "",
                "idOrCode", idOrCode);
        return reads.execute(status -> client.query(DETAIL).bindAll(parameters)
                .fetchAs(JobPosition.class).mappedBy((types, row) -> toJobPosition(row)).first());
    }

    @Override
    public JobPosition save(String organizationId, JobPosition o) {
        // No legacy port may bypass presence, optimistic concurrency or trusted author handling.
        throw new CatalogFailure(400, "USE_CATALOG_CHANGE_COMMAND");
    }

    @Override public JobPosition saveChange(String organizationId, JobPositionChange c) {
        String org = Neo4jTenantGuard.requireOrganization(organizationId);
        if (c.authorId() == null || c.authorId().isBlank()) throw new CatalogFailure(403, "FORBIDDEN");
        return writes.execute(status -> {
            Neo4jTenantGuard.requireOwnedOrAbsent(client, "JobPosition", c.id(), org);
            var params = new LinkedHashMap<String,Object>();
            params.put("org", org); params.put("id", c.id());
            params.put("code", c.code() == null ? "" : c.code());
            var found = rows("MATCH (o:JobPosition {organizationId:$org}) WHERE o.id=$id OR o.code=$id RETURN o.id AS id", params);
            if (found.size() > 1) throw new CatalogFailure(409, "AMBIGUOUS_CATALOG_IDENTITY");
            boolean existed = !found.isEmpty();
            if (!existed && !c.create()) throw new CatalogFailure(404, "JOB_POSITION_NOT_FOUND");
            String id = existed ? found.getFirst().get("id").asString() : c.id();
            if(c.code()!=null && !rows("MATCH (o:JobPosition {organizationId:$org,code:$code}) WHERE o.id<>$id RETURN o.id AS id",
                    Map.of("org",org,"code",c.code(),"id",id)).isEmpty()) throw new CatalogFailure(409,"JOB_POSITION_CODE_CONFLICT");
            // Unique graph id is the established constraint; creation never merges by an unscoped code.
            params.put("id", id);
            if (!existed) client.query("CREATE (o:JobPosition {id:$id,organizationId:$org,code:$code,name:$name,jobZone:4,status:'ACTIVE',version:'0.9.0'})")
                    .bindAll(Map.of("id",id,"org",org,"code",c.code(),"name",c.name())).run();
            if (existed && c.create()) throw new CatalogFailure(409,"JOB_POSITION_ALREADY_EXISTS");
            var patch = new LinkedHashMap<String,Object>();
            if(c.code()!=null) patch.put("code",c.code());
            if(c.name()!=null) patch.put("name",c.name());
            if(c.jobZone()!=null) patch.put("jobZone",c.jobZone());
            if(c.status()!=null) patch.put("status",c.status());
            if(c.version()!=null) patch.put("version",c.version());
            if(c.description()!=null) patch.put("description",c.description());
            if(c.interestProfile()!=null) {
                for(String key:java.util.List.of("interestRealistic","interestInvestigative","interestArtistic","interestSocial","interestEnterprising","interestConventional"))
                    patch.put(key,c.interestProfile().get(key));
            }
            client.query("MATCH (o:JobPosition {organizationId:$org,id:$id}) SET o += $patch")
                    .bindAll(Map.of("org",org,"id",id,"patch",patch)).run();
            var result = rows(DETAIL,Map.of("organizationId",org,"idOrCode",id));
            if(result.size()!=1) throw new CatalogFailure(409,"AMBIGUOUS_CATALOG_IDENTITY");
            var accepted = toJobPosition(result.getFirst());
            return accepted;
        });
    }
    private List<Record> rows(String cypher, Map<String,?> parameters) {
        return List.copyOf(client.query(cypher).bindAll(new LinkedHashMap<>(parameters)).fetchAs(Record.class).mappedBy((t,r)->r).all());
    }
    @Override
    public void delete(String organizationId, String idOrCode) {
        Objects.requireNonNull(idOrCode, "idOrCode");
        writes.executeWithoutResult(status ->
                jobPositions.deleteByIdOrCode(organizationId != null ? organizationId : "", idOrCode));
    }

    private static Integer interest(Record row,String key) {
        var v=row.get(key);
        if(v.isNull() || !v.hasType(org.neo4j.driver.internal.types.InternalTypeSystem.TYPE_SYSTEM.INTEGER())) return null;
        long n=v.asLong(); return n>=0 && n<=40?(int)n:null;
    }
    private static JobPosition toJobPosition(Record row) {
        return new JobPosition(
                row.get("id").asString(),
                row.get("code").asString(),
                row.get("name").asString(),
                row.get("jobZone").asInt(),
                row.get("status").asString(),
                row.get("version").asString(),
                row.get("roleCount").asInt(),
                row.get("microSkillCount").asInt(),row.get("description").asString(null),
                interest(row,"interestRealistic"),interest(row,"interestInvestigative"),interest(row,"interestArtistic"),
                interest(row,"interestSocial"),interest(row,"interestEnterprising"),interest(row,"interestConventional"));
    }
}

