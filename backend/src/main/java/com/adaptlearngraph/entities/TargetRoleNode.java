package com.adaptlearngraph.entities;

import java.time.Instant;
import java.util.List;
import org.springframework.data.neo4j.core.convert.ConvertWith;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/**
 * Organization-owned {@code :TargetRole} catalog node. {@code title}/{@code scope} are the template's legacy names for
 * {@code name}/{@code description}; JSON-like authoring fields are stored as strings exactly as the adapter writes them.
 */
@Node("TargetRole")
public record TargetRoleNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("baseCode") String baseCode,
        @Property("name") String name,
        @Property("title") String title,
        @Property("familyCode") String familyCode,
        @Property("track") String track,
        @Property("assignedExpertId") String assignedExpertId,
        @Property("description") String description,
        @Property("scope") String scope,
        @Property("responsibilities") List<String> responsibilities,
        @Property("status") String status,
        @Property("version") String version,
        @Property("skillTargets") String skillTargets,
        @Property("levels") List<String> levels,
        @Property("levelCompetencies") String levelCompetencies,
        @Property("competencyIds") List<String> competencyIds,
        @Property("rejectionReason") String rejectionReason,
        @Property("createdAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant createdAt,
        @Property("updatedAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant updatedAt) {
}