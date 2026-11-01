package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.TargetRoleGraph;
import java.util.Optional;

public interface TargetRoleGraphPort {
    Optional<TargetRoleGraph> findTargetRoleGraph(String organizationId, String roleId);
}
