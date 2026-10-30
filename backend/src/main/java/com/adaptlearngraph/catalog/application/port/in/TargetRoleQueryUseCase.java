package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import java.util.List;

public interface TargetRoleQueryUseCase {
    List<TargetRoleSummary> listTargetRoles(String search, Seniority seniority);

    TargetRoleDetail getTargetRole(String roleId);
}
