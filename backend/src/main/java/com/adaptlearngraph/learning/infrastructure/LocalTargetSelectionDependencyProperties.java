package com.adaptlearngraph.learning.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Explicit local/demo switches for dependencies not yet supplied by their owners. */
@ConfigurationProperties("learning.target-selection.local-dependencies")
public record LocalTargetSelectionDependencyProperties(
        boolean enabled,
        boolean assessmentInProgress) {}
