package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.TargetRoleDetail;
import com.adaptlearngraph.entities.domain.TargetRoleRequirement;
import com.adaptlearngraph.entities.domain.TargetRoleSummary;
import java.util.List;
import java.util.Optional;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;

public final class Neo4jTargetRoleMapper {
    Optional<TargetRoleSummary> toSummary(Record record) {
        return toDetail(record).map(detail -> new TargetRoleSummary(
                detail.id(),
                detail.code(),
                detail.name(),
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
                    value.get("targetMastery").isNull() ? null : value.get("targetMastery").asDouble()));
        } catch (RuntimeException invalidRequirement) {
            return Optional.empty();
        }
    }

    private static String requiredString(Value value) {
        if (value == null || value.isNull()) {
            throw new IllegalArgumentException("Expected a non-null string value");
        }
        String text = value.asString();
        if (text.isBlank()) {
            throw new IllegalArgumentException("Expected non-blank string value");
        }
        return text;
    }

    private static String optionalString(Value value) {
        if (value == null || value.isNull()) {
            return "";
        }
        return value.asString();
    }

    private static List<String> stringList(Value value) {
        if (value == null || value.isNull()) {
            return List.of();
        }
        return value.asList(Value::asString);
    }
}
