package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

public final class JdbcMemberReferenceValidator {
    private JdbcMemberReferenceValidator() {}

    public static void validate(JdbcTemplate jdbc, UUID organization, Set<String> roles,
                                UUID department, UUID occupation, boolean preserveHistoricalReferences) {
        if (roles.contains("EMPLOYEE") && (department == null || occupation == null)) {
            throw invalid("Employee department and occupation are required.");
        }
        if (department != null && !Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.department_reference
                WHERE department_id=? AND organization_id=? AND (active OR ?))
                """, Boolean.class, department, organization, preserveHistoricalReferences))) {
            throw invalid("Select a valid organization department.");
        }
        if (occupation != null && !Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.occupation_department_reference
                WHERE occupation_reference_id=? AND department_id=? AND organization_id=? AND (active OR ?))
                """, Boolean.class, occupation, department, organization, preserveHistoricalReferences))) {
            throw invalid("Select an occupation in the selected department.");
        }
    }

    private static SubscriptionFailure invalid(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.REFERENCE_DATA_REQUIRED, message);
    }
}
