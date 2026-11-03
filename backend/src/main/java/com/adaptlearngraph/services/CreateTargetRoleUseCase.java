package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreateTargetRoleCommand;
import com.adaptlearngraph.entities.domain.TargetRole;

public interface CreateTargetRoleUseCase {
    TargetRole createTargetRole(CreateTargetRoleCommand command);
}
