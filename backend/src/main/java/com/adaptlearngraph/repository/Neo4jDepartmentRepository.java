package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.Department;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionOperations;
import org.springframework.transaction.support.TransactionTemplate;

public class Neo4jDepartmentRepository implements DepartmentRepository {
    private static final String PROJECTION = """
            OPTIONAL MATCH (d)-[:HAS_JOB_POSITION]->(jp:JobPosition)
            RETURN d.id AS id,
                   d.code AS code,
                   d.name AS name,
                   coalesce(d.description, '') AS description,
                   coalesce(d.headOfDepartment, '') AS headOfDepartment,
                   coalesce(d.headEmail, '') AS headEmail,
                   coalesce(d.status, 'ACTIVE') AS status,
                   d.organizationId AS organizationId,
                   coalesce(d.createdAt, '') AS createdAt,
                   coalesce(d.updatedAt, '') AS updatedAt,
                   collect(DISTINCT jp.code) AS jobPositionCodes,
                   count(DISTINCT jp) AS jobPositionCount
            """;

    private static final String LIST = """
            MATCH (d:Department)
            WHERE d.organizationId = $organizationId
            """ + PROJECTION + """
            ORDER BY d.updatedAt DESC, d.createdAt DESC, d.name ASC
            """;

    private static final String DETAIL = """
            MATCH (d:Department)
            WHERE d.organizationId = $organizationId
              AND (d.id = $idOrCode OR d.code = $idOrCode)
            """ + PROJECTION;

    private final DepartmentNodeRepository departments;
    private final Neo4jClient client;
    private final TransactionOperations reads;
    private final TransactionTemplate writes;

    public Neo4jDepartmentRepository(DepartmentNodeRepository departments, Neo4jClient client,
                                     PlatformTransactionManager transactions) {
        this.departments = Objects.requireNonNull(departments, "departments cannot be null");
        this.client = Objects.requireNonNull(client, "Neo4jClient cannot be null");
        this.reads = Neo4jCatalogTransactions.autoCommitReads(transactions);
        this.writes = Neo4jCatalogTransactions.readWrite(transactions);
    }

    @Override
    public List<Department> findAllDepartments(String organizationId) {
        return reads.execute(status -> new ArrayList<>(client.query(LIST)
                .bindAll(Map.of("organizationId", organizationId != null ? organizationId : ""))
                .fetchAs(Department.class).mappedBy((types, row) -> toDepartment(row)).all()));
    }

    @Override
    public Optional<Department> findByIdOrCode(String organizationId, String idOrCode) {
        Map<String, Object> parameters = Map.of(
                "organizationId", organizationId != null ? organizationId : "",
                "idOrCode", idOrCode);
        return reads.execute(status -> client.query(DETAIL).bindAll(parameters)
                .fetchAs(Department.class).mappedBy((types, row) -> toDepartment(row)).first());
    }

    @Override
    public Department save(String organizationId, Department d) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        String id = d.id() != null && !d.id().isBlank() ? d.id()
                : UUID.nameUUIDFromBytes((organization + ":department:" + d.code()).getBytes(StandardCharsets.UTF_8)).toString();
        writes.executeWithoutResult(status -> {
            Neo4jTenantGuard.requireOwnedOrAbsent(client, "Department", id, organization);
            departments.merge(id, organization, d.code(), d.name(),
                    d.description() != null ? d.description() : "",
                    d.headOfDepartment() != null ? d.headOfDepartment() : "",
                    d.headEmail() != null ? d.headEmail() : "",
                    d.status() != null ? d.status() : "ACTIVE",
                    d.createdAt() != null ? d.createdAt() : java.time.Instant.now().toString(),
                    d.updatedAt() != null ? d.updatedAt() : java.time.Instant.now().toString());

            if (d.jobPositionCodes() != null) {
                client.query("MATCH (d:Department {organizationId: $organizationId}) WHERE d.id = $id OR d.code = $id OPTIONAL MATCH (d)-[r:HAS_JOB_POSITION]->() DELETE r")
                        .bindAll(Map.of("organizationId", organization, "id", id)).run();
                for (String jpCode : d.jobPositionCodes()) {
                    if (jpCode != null && !jpCode.isBlank()) {
                        departments.linkJobPosition(organization, id, jpCode);
                    }
                }
            }
        });
        return d;
    }

    @Override
    public void delete(String organizationId, String idOrCode) {
        Objects.requireNonNull(idOrCode, "idOrCode");
        writes.executeWithoutResult(status ->
                departments.deleteByIdOrCode(organizationId != null ? organizationId : "", idOrCode));
    }

    @Override
    public void linkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        writes.executeWithoutResult(status ->
                departments.linkJobPosition(organization, departmentIdOrCode, jobPositionIdOrCode));
    }

    @Override
    public void unlinkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode) {
        String organization = Neo4jTenantGuard.requireOrganization(organizationId);
        writes.executeWithoutResult(status ->
                departments.unlinkJobPosition(organization, departmentIdOrCode, jobPositionIdOrCode));
    }

    private static Department toDepartment(Record row) {
        Value codesVal = row.get("jobPositionCodes");
        List<String> codes = codesVal != null && !codesVal.isNull()
                ? codesVal.asList(Value::asString)
                : List.of();
        return new Department(
                row.get("id").asString(""),
                row.get("code").asString(""),
                row.get("name").asString(""),
                row.get("description").asString(""),
                row.get("headOfDepartment").asString(""),
                row.get("headEmail").asString(""),
                row.get("status").asString("ACTIVE"),
                row.get("organizationId").asString(""),
                row.get("createdAt").asString(""),
                row.get("updatedAt").asString(""),
                codes,
                row.get("jobPositionCount").asInt(0)
        );
    }
}

