package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.TargetRoleDetail;
import com.adaptlearngraph.entities.domain.TargetRoleSummary;
import java.util.List;
import java.util.Optional;

public interface TargetRoleCatalogPort {
    List<TargetRoleSummary> findAvailableRoles(String organizationId, Criteria criteria);

    Optional<TargetRoleDetail> findAvailableRole(String organizationId, String roleId);

    record Criteria(String normalizedSearch) {}
}
