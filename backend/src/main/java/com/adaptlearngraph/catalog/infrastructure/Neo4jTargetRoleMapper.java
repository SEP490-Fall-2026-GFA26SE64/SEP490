package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.catalog.domain.CareerTrack;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleRequirement;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import java.util.List;
import java.util.Optional;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;

final class Neo4jTargetRoleMapper {
    Optional<TargetRoleSummary> toSummary(Record record) {
        return toDetail(record).map(detail -> new TargetRoleSummary(
                detail.id(),
                detail.code(),
                detail.name(),
                detail.track(),
                detail.seniority(),
                detail.description(),
                detail.requirements().size()));
    }

    Optional<TargetRoleDetail> toDetail(Record record) {
        try {
            List<Optional<TargetRoleRequirement>> mappedRequirements =
                    record.get("requirements").asList(this::toRequirement);
            if (mappedRequirements.isEmpty() || mappedRequirements.stream().anyMatch(Optional::isEmpty)) {
                return Optional.empty();
            }
            List<TargetRoleRequirement> requirements = mappedRequirements.stream().map(Optional::orElseThrow).toList();
            return Optional.of(new TargetRoleDetail(
                    requiredString(record.get("id")),
                    requiredString(record.get("code")),
                    requiredString(record.get("name")),
                    requiredString(record.get("familyCode")),
                    CareerTrack.valueOf(requiredString(record.get("track"))),
                    Seniority.valueOf(requiredString(record.get("seniority"))),
                    optionalString(record.get("description")),
                    stringList(record.get("responsibilities")),
                    requirements));
        } catch (RuntimeException invalidCatalogData) {
            return Optional.empty();
        }
    }

    private Optional<TargetRoleRequirement> toRequirement(Value value) {
        try {
            return Optional.of(new TargetRoleRequirement(
                    requiredString(value.get("skillId")),
                    requiredString(value.get("skillCode")),
                    requiredString(value.get("skillName")),
                    value.get("targetMastery").asDouble()));
        } catch (RuntimeException invalidRequirement) {
            return Optional.empty();
        }
    }

    private static String requiredString(Value value) {
        String result = value.asString();
        if (result.isBlank()) {
            throw new IllegalArgumentException("Required catalog string is blank");
        }
        return result;
    }

    private static String optionalString(Value value) {
        return value.isNull() ? null : value.asString();
    }

    private static List<String> stringList(Value value) {
        return value.isNull() ? List.of() : value.asList(Neo4jTargetRoleMapper::requiredString);
    }
}
