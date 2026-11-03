package com.adaptlearngraph.dtos;

import com.adaptlearngraph.entities.domain.TargetRoleSelection;
import java.util.Objects;

/** Observable result of one target-role selection invocation. */
public record TargetRoleSelectionResult(
        TargetRoleSelection selection,
        Disposition disposition) {

    public TargetRoleSelectionResult {
        selection = Objects.requireNonNull(selection, "selection must not be null");
        disposition = Objects.requireNonNull(disposition, "disposition must not be null");
    }

    public boolean changed() {
        return disposition == Disposition.APPLIED;
    }

    public enum Disposition {
        APPLIED,
        UNCHANGED
    }
}
