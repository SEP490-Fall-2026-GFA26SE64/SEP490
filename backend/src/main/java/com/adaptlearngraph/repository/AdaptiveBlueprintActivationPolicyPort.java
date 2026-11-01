package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveBlueprint.Scope;

/** Checks the trusted organization's effective policy within a new activation transaction. */
@FunctionalInterface
public interface AdaptiveBlueprintActivationPolicyPort {
    void requireActive(Scope scope);
}
