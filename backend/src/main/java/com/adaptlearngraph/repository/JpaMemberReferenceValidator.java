package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.SubscriptionFailure;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Validates organization-owned department/job-position references for a membership (JPA, organization scoped). */
public final class JpaMemberReferenceValidator {
    public record ValidatedReferences(UUID departmentId, UUID jobPositionReferenceId) {}

    private final DepartmentReferenceJpaRepository references;

    public JpaMemberReferenceValidator(DepartmentReferenceJpaRepository references) {
        this.references = references;
    }

    public ValidatedReferences validate(UUID organization, Set<String> roles, UUID department, UUID jobPosition,
                                        boolean preserveHistoricalReferences) {
        return validate(organization, roles, department, jobPosition, null, null, preserveHistoricalReferences);
    }

    public ValidatedReferences validate(UUID organization, Set<String> roles, UUID department, UUID jobPosition,
                                        String departmentName, String jobPositionName,
                                        boolean preserveHistoricalReferences) {
        if (roles.contains("EMPLOYEE") && (department == null || jobPosition == null)) {
            throw invalid("Employee department and jobPosition are required.");
        }
        UUID effectiveDept = department;
        if (effectiveDept != null) {
            String deptName = (departmentName != null && !departmentName.isBlank() && !departmentName.startsWith("Department "))
                    ? departmentName.trim() : null;
            List<UUID> owners = references.findDepartmentOwnerOrganizationIds(effectiveDept);
            if (!owners.isEmpty() && !owners.contains(organization)) {
                if (deptName != null) {
                    effectiveDept = UUID.nameUUIDFromBytes((organization + ":department:" + department).getBytes(StandardCharsets.UTF_8));
                } else {
                    throw invalid("Select a valid organization department.");
                }
            }
            if (!references.departmentUsable(organization, effectiveDept, preserveHistoricalReferences) || deptName != null) {
                try {
                    references.upsertDepartmentReference(effectiveDept, organization, deptName != null ? deptName : ("Department " + effectiveDept));
                } catch (Exception ex) {
                    throw invalid("Select a valid organization department.");
                }
            }
        }
        UUID effectiveJobPos = jobPosition;
        if (effectiveJobPos != null) {
            String jpName = (jobPositionName != null && !jobPositionName.isBlank() && !jobPositionName.startsWith("Job Position "))
                    ? jobPositionName.trim() : null;
            List<UUID> owners = references.findJobPositionOwnerOrganizationIds(effectiveJobPos);
            if (!owners.isEmpty() && !owners.contains(organization)) {
                if (jpName != null) {
                    effectiveJobPos = UUID.nameUUIDFromBytes((organization + ":job_pos:" + jobPosition).getBytes(StandardCharsets.UTF_8));
                } else {
                    throw invalid("Select an jobPosition in the selected department.");
                }
            }
            if (!references.jobPositionUsable(organization, effectiveDept, effectiveJobPos, preserveHistoricalReferences) || jpName != null) {
                try {
                    references.upsertJobPositionReference(effectiveJobPos, effectiveJobPos, organization, effectiveDept != null ? effectiveDept : organization, jpName != null ? jpName : ("Job Position " + effectiveJobPos));
                } catch (Exception ex) {
                    throw invalid("Select an jobPosition in the selected department.");
                }
            }
        }
        return new ValidatedReferences(effectiveDept, effectiveJobPos);
    }

    private static SubscriptionFailure invalid(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED, message);
    }
}
