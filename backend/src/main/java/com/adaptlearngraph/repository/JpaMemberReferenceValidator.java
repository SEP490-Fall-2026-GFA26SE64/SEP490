package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.SubscriptionFailure;
import java.util.Set;
import java.util.UUID;

/** Validates organization-owned department/job-position references for a membership (JPA, organization scoped). */
public final class JpaMemberReferenceValidator {
    private final DepartmentReferenceJpaRepository references;

    public JpaMemberReferenceValidator(DepartmentReferenceJpaRepository references) {
        this.references = references;
    }

    public void validate(UUID organization, Set<String> roles, UUID department, UUID jobPosition,
                         boolean preserveHistoricalReferences) {
        validate(organization, roles, department, jobPosition, null, null, preserveHistoricalReferences);
    }

    public void validate(UUID organization, Set<String> roles, UUID department, UUID jobPosition,
                         String departmentName, String jobPositionName,
                         boolean preserveHistoricalReferences) {
        if (roles.contains("EMPLOYEE") && (department == null || jobPosition == null)) {
            throw invalid("Employee department and jobPosition are required.");
        }
        if (department != null) {
            String deptName = (departmentName != null && !departmentName.isBlank() && !departmentName.startsWith("Department "))
                    ? departmentName.trim() : null;
            if (!references.departmentUsable(organization, department, preserveHistoricalReferences) || deptName != null) {
                try {
                    references.upsertDepartmentReference(department, organization, deptName != null ? deptName : ("Department " + department));
                } catch (Exception ex) {
                    throw invalid("Select a valid organization department.");
                }
            }
        }
        if (jobPosition != null) {
            String jpName = (jobPositionName != null && !jobPositionName.isBlank() && !jobPositionName.startsWith("Job Position "))
                    ? jobPositionName.trim() : null;
            if (!references.jobPositionUsable(organization, department, jobPosition, preserveHistoricalReferences) || jpName != null) {
                try {
                    references.upsertJobPositionReference(jobPosition, jobPosition, organization, department != null ? department : organization, jpName != null ? jpName : ("Job Position " + jobPosition));
                } catch (Exception ex) {
                    throw invalid("Select an jobPosition in the selected department.");
                }
            }
        }
    }

    private static SubscriptionFailure invalid(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED, message);
    }
}
