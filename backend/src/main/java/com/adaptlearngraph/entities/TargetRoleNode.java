package com.adaptlearngraph.entities;

import java.time.Instant;
import java.util.List;
import org.springframework.data.neo4j.core.convert.ConvertWith;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Property;

/**
 * Organization-owned {@code :TargetRole} catalog node.
 * Role levels are stored strictly as connected {@code :Level} nodes via {@code :HAS_LEVEL}, not as a node property.
 */
@Node("TargetRole")
public record TargetRoleNode(
        @Id String id,
        @Property("organizationId") String organizationId,
        @Property("code") String code,
        @Property("baseCode") String baseCode,
        @Property("name") String name,
        @Property("familyCode") String familyCode,
        @Property("assignedExpertId") String assignedExpertId,
        @Property("description") String description,
        @Property("scope") String scope,
        @Property("responsibilities") List<String> responsibilities,
        @Property("status") String status,
        @Property("version") String version,
        @Property("skillTargets") String skillTargets,
        @Property("levelCompetencies") String levelCompetencies,
        @Property("competencyIds") List<String> competencyIds,
        @Property("rejectionReason") String rejectionReason,
        @Property("createdAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant createdAt,
        @Property("updatedAt") @ConvertWith(converter = LenientGraphInstantConverter.class) Instant updatedAt,
        @Property("isStaffingEnabled") Boolean isStaffingEnabled) {

    public TargetRoleNode(
            String id, String organizationId, String code, String baseCode, String name, String familyCode,
            String assignedExpertId, String description, String scope,
            List<String> responsibilities, String status, String version, String skillTargets,
            String levelCompetencies, List<String> competencyIds, String rejectionReason,
            Instant createdAt, Instant updatedAt) {
        this(id, organizationId, code, baseCode, name, familyCode, assignedExpertId, description, scope,
                responsibilities, status, version, skillTargets, levelCompetencies, competencyIds, rejectionReason,
                createdAt, updatedAt, "STAGED".equalsIgnoreCase(status));
    }

    public TargetRoleNode(
            String id, String organizationId, String code, String baseCode, String name,
            String assignedExpertId, String description, String scope,
            List<String> responsibilities, String status, String version, String skillTargets,
            String levelCompetencies, List<String> competencyIds, String rejectionReason,
            Instant createdAt, Instant updatedAt) {
        this(id, organizationId, code, baseCode, name, "", assignedExpertId, description, scope,
                responsibilities, status, version, skillTargets, levelCompetencies, competencyIds, rejectionReason,
                createdAt, updatedAt, "STAGED".equalsIgnoreCase(status));
    }
}
