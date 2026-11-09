package com.adaptlearngraph.entities;

import java.time.Instant;
import org.springframework.data.neo4j.core.convert.ConvertWith;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/** Organization-owned {@code :MicroSkill} catalog node; {@code definition} is the template's name for the description. */
@Node("MicroSkill")
public record MicroSkillNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("sourceId") String sourceId,
        @Property("name") String name,
        @Property("description") String description,
        @Property("definition") String definition,
        @Property("status") String status,
        @Property("version") String version,
        @Property("createdAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant createdAt,
        @Property("updatedAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant updatedAt,
        @Property("moduleOnlyKnowledgeLevels") java.util.List<String> moduleOnlyKnowledgeLevels,
        @Property("certificateOnlyKnowledgeLevels") java.util.List<String> certificateOnlyKnowledgeLevels,
        @Property("foundationOutcomeCodes") java.util.List<String> foundationOutcomeCodes,
        @Property("intermediateOutcomeCodes") java.util.List<String> intermediateOutcomeCodes,
        @Property("advancedOutcomeCodes") java.util.List<String> advancedOutcomeCodes) {
}
