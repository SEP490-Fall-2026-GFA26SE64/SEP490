package com.adaptlearngraph.entities.domain;

import java.util.List;

/**
 * A Guest-imported organization structure following the platform graph frame
 * Department -HAS_JOB_POSITION-> JobPosition -HAS_ROLE-> TargetRole -HAS_LEVEL-> Level. Already validated and normalized.
 */
public record OrganizationStructure(List<Department> departments) {
    public OrganizationStructure {
        departments = List.copyOf(departments);
    }

    public record Department(String code, String name, String description, List<JobPosition> jobPositions) {
        public Department {
            jobPositions = List.copyOf(jobPositions);
        }
    }

    public record JobPosition(String code, String name, List<TargetRole> targetRoles) {
        public JobPosition {
            targetRoles = List.copyOf(targetRoles);
        }
    }

    public record TargetRole(String code, String name, String scope, List<Level> levels) {
        public TargetRole {
            levels = List.copyOf(levels);
        }
    }

    public record Level(String code, String name, int rank) {
    }

    public int departmentCount() {
        return departments.size();
    }

    public int jobPositionCount() {
        return departments.stream().mapToInt(d -> d.jobPositions().size()).sum();
    }

    public int targetRoleCount() {
        return departments.stream().flatMap(d -> d.jobPositions().stream()).mapToInt(j -> j.targetRoles().size()).sum();
    }

    public int levelCount() {
        return departments.stream().flatMap(d -> d.jobPositions().stream()).flatMap(j -> j.targetRoles().stream())
                .mapToInt(r -> r.levels().size()).sum();
    }

    public int nodeCount() {
        return departmentCount() + jobPositionCount() + targetRoleCount() + levelCount();
    }

    /** Every non-department node has exactly one ownership relationship. */
    public int relationshipCount() {
        return jobPositionCount() + targetRoleCount() + levelCount();
    }

    public boolean isEmpty() {
        return departments.isEmpty();
    }
}
