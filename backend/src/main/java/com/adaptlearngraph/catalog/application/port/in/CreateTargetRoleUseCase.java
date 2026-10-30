package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.TargetRole;

public interface CreateTargetRoleUseCase {
    TargetRole createTargetRole(CreateTargetRoleCommand command);
}
