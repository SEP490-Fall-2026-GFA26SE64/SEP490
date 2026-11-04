package com.adaptlearngraph.entities;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/** Organization-owned {@code :JobPosition} catalog node. Read model only; writes use scoped Cypher. */
@Node("JobPosition")
public record JobPositionNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("name") String name,
        @Property("jobZone") Long jobZone,
        @Property("interestRealistic") Double interestRealistic,
        @Property("interestInvestigative") Double interestInvestigative,
        @Property("interestArtistic") Double interestArtistic,
        @Property("interestSocial") Double interestSocial,
        @Property("interestEnterprising") Double interestEnterprising,
        @Property("interestConventional") Double interestConventional,
        @Property("status") String status,
        @Property("version") String version) {
}

