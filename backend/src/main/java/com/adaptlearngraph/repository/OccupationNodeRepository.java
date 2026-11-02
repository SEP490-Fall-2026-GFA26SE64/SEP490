package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.OccupationNode;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Organization-scoped writes of {@code :Occupation}. List/detail reads aggregate role and skill counts and therefore run
 * through {@code Neo4jClient} in {@link Neo4jOccupationRepository}; no unscoped CRUD is exposed.
 */
public interface OccupationNodeRepository extends Repository<OccupationNode, String> {

    // MERGE on the (organizationId, code) business key with distinct ON CREATE / ON MATCH sets: not expressible as a save().
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MERGE (o:Occupation {organizationId: $organizationId, code: $code})
            ON CREATE SET
                o.id = $id,
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
            """)
    void merge(@Param("id") String id, @Param("organizationId") String organizationId, @Param("code") String code,
            @Param("name") String name, @Param("jobZone") int jobZone,
            @Param("interestRealistic") double interestRealistic,
            @Param("interestInvestigative") double interestInvestigative,
            @Param("interestArtistic") double interestArtistic, @Param("interestSocial") double interestSocial,
            @Param("interestEnterprising") double interestEnterprising,
            @Param("interestConventional") double interestConventional,
            @Param("status") String status, @Param("version") String version);

    // Matches by id OR code (callers pass either) and detaches relationships before deleting.
    @Transactional(TransactionManagers.NEO4J)
    @Query("""
            MATCH (o:Occupation)
            WHERE o.organizationId = $organizationId
              AND (o.id = $idOrCode OR o.code = $idOrCode)
            DETACH DELETE o
            """)
    void deleteByIdOrCode(@Param("organizationId") String organizationId, @Param("idOrCode") String idOrCode);
}