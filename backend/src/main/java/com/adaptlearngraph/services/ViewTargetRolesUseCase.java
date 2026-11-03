package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;

import java.util.List;
import java.util.Optional;

public interface ViewTargetRolesUseCase {
    List<TargetRole> listTargetRoles(String organizationId, TargetRoleFilter filter);

    Optional<TargetRole> getTargetRole(String organizationId, TargetRoleId roleId);
}
