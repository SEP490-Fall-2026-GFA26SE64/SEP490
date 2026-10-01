package com.adaptlearngraph.learning.application.port.in;

import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import java.util.Optional;

/** Employee operations for reading and choosing the active target role. */
public interface TargetRoleSelectionUseCase {
    Optional<TargetRoleSelection> getCurrentSelection();

    TargetRoleSelectionResult chooseTargetRole(ChooseTargetRoleCommand command);
}
