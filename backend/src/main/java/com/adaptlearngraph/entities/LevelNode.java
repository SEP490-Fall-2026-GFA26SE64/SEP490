package com.adaptlearngraph.entities;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/** Organization-owned {@code :Level} catalog node (a seniority level of one TargetRole). */
@Node("Level")
public record LevelNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("name") String name,
        @Property("rank") Long rank,
        @Property("attainmentRule") String attainmentRule,
        @Property("status") String status,
        @Property("version") String version) {
}