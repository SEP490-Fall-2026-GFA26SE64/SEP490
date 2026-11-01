package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.ChooseTargetRoleCommand;
import com.adaptlearngraph.dtos.TargetRoleSelectionResult;
import com.adaptlearngraph.entities.TargetRoleSelection;
import java.util.Optional;

/** Employee operations for reading and choosing the active target role. */
public interface TargetRoleSelectionUseCase {
    Optional<TargetRoleSelection> getCurrentSelection();

    TargetRoleSelectionResult chooseTargetRole(ChooseTargetRoleCommand command);
}
