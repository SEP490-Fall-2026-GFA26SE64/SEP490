package com.adaptlearngraph.competency.application.port.out;

import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import java.util.Optional;

public interface TargetRoleGraphPort {
    Optional<TargetRoleGraph> findTargetRoleGraph(String organizationId, String roleId);
}
