package com.adaptlearngraph.entities;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/**
 * Organization-owned {@code :LearningModule} catalog node: the v0.11 catalog properties plus the legacy module-editor
 * fields ({@code name}, {@code durationMinutes}). Reads project these columns with their legacy defaults in Cypher;
 * {@code reviewedAt} is kept as written (ISO-8601 text).
 */
@Node("LearningModule")
public record LearningModuleNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("title") String title,
        @Property("name") String name,
        @Property("moduleType") String moduleType,
        @Property("contentUri") String contentUri,
        @Property("contentType") String contentType,
        @Property("contentVersion") String contentVersion,
        @Property("version") String version,
        @Property("status") String status,
        @Property("reviewStatus") String reviewStatus,
        @Property("reviewedBy") String reviewedBy,
        @Property("reviewedAt") String reviewedAt,
        @Property("duration") Integer duration,
        @Property("durationMinutes") Integer durationMinutes) {
}
