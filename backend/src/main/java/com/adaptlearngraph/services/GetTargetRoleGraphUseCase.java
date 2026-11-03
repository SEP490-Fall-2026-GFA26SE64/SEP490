package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.TargetRoleGraph;
import java.util.Optional;

public interface GetTargetRoleGraphUseCase {
    Optional<TargetRoleGraph> getTargetRoleGraph(String organizationId, String roleId);
}
