package com.adaptlearngraph.entities;

import java.time.Instant;
import org.springframework.data.neo4j.core.convert.ConvertWith;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/** Organization-owned {@code :MacroCompetency} grouping node (KNOWLEDGE, COMMUNICATION, ...). */
@Node("MacroCompetency")
public record MacroCompetencyNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("name") String name,
        @Property("description") String description,
        @Property("status") String status,
        @Property("createdAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant createdAt,
        @Property("updatedAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant updatedAt) {
}