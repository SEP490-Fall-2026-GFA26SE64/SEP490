package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

import java.util.List;
import java.util.Optional;

public interface ViewTargetRolesUseCase {
    List<TargetRole> listTargetRoles(String organizationId, TargetRoleFilter filter);

    Optional<TargetRole> getTargetRole(String organizationId, TargetRoleId roleId);
}
