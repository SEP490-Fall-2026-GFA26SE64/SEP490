package com.adaptlearngraph.repository;

import com.adaptlearngraph.exception.SubscriptionFailure;
import java.util.Set;
import java.util.UUID;

/** Validates organization-owned department/occupation references for a membership (JPA, organization scoped). */
public final class JpaMemberReferenceValidator {
    private final DepartmentReferenceJpaRepository references;

    public JpaMemberReferenceValidator(DepartmentReferenceJpaRepository references) {
        this.references = references;
    }

    public void validate(UUID organization, Set<String> roles, UUID department, UUID occupation,
                         boolean preserveHistoricalReferences) {
        if (roles.contains("EMPLOYEE") && (department == null || occupation == null)) {
            throw invalid("Employee department and occupation are required.");
        }
        if (department != null && !references.departmentUsable(organization, department, preserveHistoricalReferences)) {
            throw invalid("Select a valid organization department.");
        }
        if (occupation != null
                && !references.occupationUsable(organization, department, occupation, preserveHistoricalReferences)) {
            throw invalid("Select an occupation in the selected department.");
        }
    }

    private static SubscriptionFailure invalid(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED, message);
    }
}
