package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;

import java.util.Optional;

public interface ManageTargetRoleUseCase {
    Optional<TargetRole> updateTargetRole(UpdateTargetRoleCommand command);

    boolean deleteTargetRole(String organizationId, TargetRoleId roleId);
}
