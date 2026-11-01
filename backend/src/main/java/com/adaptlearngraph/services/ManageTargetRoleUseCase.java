package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.UpdateTargetRoleCommand;
import com.adaptlearngraph.entities.TargetRole;
import com.adaptlearngraph.entities.TargetRoleId;

import java.util.Optional;

public interface ManageTargetRoleUseCase {
    Optional<TargetRole> updateTargetRole(UpdateTargetRoleCommand command);

    boolean deleteTargetRole(String organizationId, TargetRoleId roleId);
}
