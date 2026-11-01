package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.TargetRoleGraph;
import java.util.Optional;

public interface GetTargetRoleGraphUseCase {
    Optional<TargetRoleGraph> getTargetRoleGraph(String organizationId, String roleId);
}
