package com.adaptlearngraph.entities;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/** Organization-owned {@code :Competency} catalog node (owned by one Level, groups MicroSkills). */
@Node("Competency")
public record CompetencyNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("name") String name,
        @Property("description") String description,
        @Property("attainmentRule") String attainmentRule,
        @Property("status") String status,
        @Property("version") String version,
        @Property("reviewStatus") String reviewStatus,
        @Property("departmentId") String departmentId,
        @Property("departmentName") String departmentName,
        @Property("jobPositionCode") String jobPositionCode,
        @Property("jobPositionTitle") String jobPositionTitle) {
}
