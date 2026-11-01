package com.adaptlearngraph.assessment.adaptive.application.port.out;

import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;

/** Checks the trusted organization's effective policy within a new activation transaction. */
@FunctionalInterface
public interface AdaptiveBlueprintActivationPolicyPort {
    void requireActive(Scope scope);
}
