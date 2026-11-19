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

    public record JobPosition(String code, String name, List<TargetRole> targetRoles, java.util.Map<String,Integer> interestProfile) {
        public JobPosition(String code,String name,List<TargetRole> targetRoles){this(code,name,targetRoles,java.util.Map.of());}
        public JobPosition {
            targetRoles = List.copyOf(targetRoles);
            interestProfile = interestProfile == null ? java.util.Map.of() : java.util.Map.copyOf(interestProfile);
            var fields=java.util.Set.of("interestRealistic","interestInvestigative","interestArtistic","interestSocial","interestEnterprising","interestConventional");
            if (!interestProfile.isEmpty() && (!interestProfile.keySet().equals(fields)
                    || interestProfile.values().stream().anyMatch(v -> v < 0 || v > 40)))
                throw new IllegalArgumentException("All six RIASEC scores must be whole numbers from 0 to 40");
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
