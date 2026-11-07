package com.adaptlearngraph.exception;

import java.util.List;

/** Publication requires explicit skill requirements for every member level. */
public final class IncompleteRoleRequirementsException extends IllegalArgumentException {
    private final List<String> levels;

    public IncompleteRoleRequirementsException(List<String> levels) {
        super("Complete skill requirements for these Role levels: " + String.join(", ", levels));
        this.levels = List.copyOf(levels);
    }

    public List<String> getLevels() { return levels; }
}
