package com.adaptlearngraph.competency.application.port.in;

import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import java.util.Optional;

public interface GetTargetRoleGraphUseCase {
    Optional<TargetRoleGraph> getTargetRoleGraph(String organizationId, String roleId);
}
