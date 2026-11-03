package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.UpdateTargetRoleCommand;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;

import java.util.Optional;

public interface ManageTargetRoleUseCase {
    Optional<TargetRole> updateTargetRole(UpdateTargetRoleCommand command);

    boolean deleteTargetRole(String organizationId, TargetRoleId roleId);
}
