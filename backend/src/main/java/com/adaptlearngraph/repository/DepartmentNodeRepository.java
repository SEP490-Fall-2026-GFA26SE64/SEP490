package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.DepartmentNode;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization-scoped writes for {@code :Department} in Neo4j.
 */
public interface DepartmentNodeRepository extends Repository<DepartmentNode, String> {

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MERGE (d:Department {organizationId: $organizationId, code: $code})
            ON CREATE SET
                d.id = $id,
                d.code = $code,
                d.name = $name,
                d.description = $description,
                d.headOfDepartment = $headOfDepartment,
                d.headEmail = $headEmail,
                d.status = $status,
                d.createdAt = $createdAt,
                d.updatedAt = $updatedAt
            ON MATCH SET
                d.name = $name,
                d.description = $description,
                d.headOfDepartment = $headOfDepartment,
                d.headEmail = $headEmail,
                d.status = $status,
                d.updatedAt = $updatedAt
            """)
    void merge(@Param("id") String id,
               @Param("organizationId") String organizationId,
               @Param("code") String code,
               @Param("name") String name,
               @Param("description") String description,
               @Param("headOfDepartment") String headOfDepartment,
               @Param("headEmail") String headEmail,
               @Param("status") String status,
               @Param("createdAt") String createdAt,
               @Param("updatedAt") String updatedAt);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (d:Department {organizationId: $organizationId})
            WHERE d.id = $idOrCode OR d.code = $idOrCode
            DETACH DELETE d
            """)
    void deleteByIdOrCode(@Param("organizationId") String organizationId, @Param("idOrCode") String idOrCode);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (d:Department {organizationId: $organizationId})
            WHERE d.id = $departmentIdOrCode OR d.code = $departmentIdOrCode
            MATCH (jp:JobPosition)
            WHERE (jp.organizationId = $organizationId OR jp.organizationId IS NULL OR jp.organizationId = '')
              AND (jp.id = $jobPositionIdOrCode OR jp.code = $jobPositionIdOrCode)
            MERGE (d)-[r:HAS_JOB_POSITION]->(jp)
            RETURN count(r)
            """)
    int linkJobPosition(@Param("organizationId") String organizationId,
                        @Param("departmentIdOrCode") String departmentIdOrCode,
                        @Param("jobPositionIdOrCode") String jobPositionIdOrCode);

    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (d:Department {organizationId: $organizationId})
            WHERE d.id = $departmentIdOrCode OR d.code = $departmentIdOrCode
            MATCH (d)-[r:HAS_JOB_POSITION]->(jp:JobPosition)
            WHERE jp.id = $jobPositionIdOrCode OR jp.code = $jobPositionIdOrCode
            DELETE r
            """)
    void unlinkJobPosition(@Param("organizationId") String organizationId,
                          @Param("departmentIdOrCode") String departmentIdOrCode,
                          @Param("jobPositionIdOrCode") String jobPositionIdOrCode);
}

