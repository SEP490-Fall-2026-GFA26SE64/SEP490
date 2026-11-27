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
        @Property("status") String status,
        @Property("version") String version,
        @Property("description") String description,
        @Property("interestRealistic") Long interestRealistic,@Property("interestInvestigative") Long interestInvestigative,
        @Property("interestArtistic") Long interestArtistic,@Property("interestSocial") Long interestSocial,
        @Property("interestEnterprising") Long interestEnterprising,@Property("interestConventional") Long interestConventional) {
}

