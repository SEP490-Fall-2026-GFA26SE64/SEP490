package com.adaptlearngraph.learning.domain;

import java.util.Objects;

/** Domain decision made from the active selection and the requested target role. */
public record TargetSelectionDecision(
        Kind kind,
        TargetRoleSelection currentSelection,
        TargetRoleSnapshot requestedRole) {

    public TargetSelectionDecision {
        kind = Objects.requireNonNull(kind, "kind must not be null");
        requestedRole = Objects.requireNonNull(requestedRole, "requestedRole must not be null");

        if (kind == Kind.INITIAL) {
            if (currentSelection != null) {
                throw new IllegalArgumentException("initial selection must not have a current selection");
            }
        } else {
            if (currentSelection == null || !currentSelection.isActive()) {
                throw new IllegalArgumentException("role decision requires an active current selection");
            }
            boolean sameRole = currentSelection.roleSnapshot().id().equals(requestedRole.id());
            if (kind == Kind.NO_OP && !sameRole) {
                throw new IllegalArgumentException("no-op requires the currently selected role");
            }
            if (kind == Kind.CHANGE && sameRole) {
                throw new IllegalArgumentException("role change requires a different role");
            }
        }
    }

    public static TargetSelectionDecision decide(
            TargetRoleSelection currentSelection,
            TargetRoleSnapshot requestedRole) {
        Objects.requireNonNull(requestedRole, "requestedRole must not be null");
        if (currentSelection == null) {
            return new TargetSelectionDecision(Kind.INITIAL, null, requestedRole);
        }
        if (!currentSelection.isActive()) {
            throw new IllegalArgumentException("currentSelection must be active");
        }
        Kind kind = currentSelection.roleSnapshot().id().equals(requestedRole.id())
                ? Kind.NO_OP
                : Kind.CHANGE;
        return new TargetSelectionDecision(kind, currentSelection, requestedRole);
    }

    public boolean changesState() {
        return kind != Kind.NO_OP;
    }

    public enum Kind {
        INITIAL,
        CHANGE,
        NO_OP
    }
}
