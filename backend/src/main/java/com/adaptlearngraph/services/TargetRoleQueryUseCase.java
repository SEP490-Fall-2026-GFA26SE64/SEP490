package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.TargetRoleDetail;
import com.adaptlearngraph.entities.TargetRoleSummary;
import java.util.List;

public interface TargetRoleQueryUseCase {
    List<TargetRoleSummary> listTargetRoles(String search);

    TargetRoleDetail getTargetRole(String roleId);
}
