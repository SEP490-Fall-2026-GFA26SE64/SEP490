package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.TargetRoleGraph;
import java.util.Optional;

public interface TargetRoleGraphPort {
    Optional<TargetRoleGraph> findTargetRoleGraph(String organizationId, String roleId);
}
