package com.adaptlearngraph.entities;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;
import org.springframework.data.neo4j.core.schema.Relationship;
import java.util.List;

/**
 * Organization-owned {@code :Department} node in Neo4j Knowledge Graph.
 * Linked to {@code :JobPosition} via {@code :HAS_JOB_POSITION} relationship.
 */
@Node("Department")
public record DepartmentNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("name") String name,
        @Property("description") String description,
        @Property("headOfDepartment") String headOfDepartment,
        @Property("headEmail") String headEmail,
        @Property("status") String status,
        @Property("createdAt") String createdAt,
        @Property("updatedAt") String updatedAt,
        @Relationship(type = "HAS_JOB_POSITION", direction = Relationship.Direction.OUTGOING)
        List<JobPositionNode> jobPositions) {
}

