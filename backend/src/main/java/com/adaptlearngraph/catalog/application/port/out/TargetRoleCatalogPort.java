package com.adaptlearngraph.catalog.application.port.out;

import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import java.util.List;
import java.util.Optional;

public interface TargetRoleCatalogPort {
    List<TargetRoleSummary> findAvailableRoles(String organizationId, Criteria criteria);

    Optional<TargetRoleDetail> findAvailableRole(String organizationId, String roleId);

    record Criteria(String normalizedSearch, Seniority seniority) {}
}
