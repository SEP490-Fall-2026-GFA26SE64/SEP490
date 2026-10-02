package com.adaptlearngraph.pathway.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A single step (module) in an employee's adaptive pathway view.
 *
 * @param stepId            internal pathway step identifier.
 * @param ordinal           position in the pathway (1-based).
 * @param moduleRefId       catalog reference id of the learning module.
 * @param moduleEntityId    stable entity id of the module across catalog releases.
 * @param moduleTitle       human-readable module title from the Neo4j catalog.
 * @param required          whether this module is mandatory for the pathway.
 * @param status            one of the five defined {@link ModuleStatus} values.
 * @param prerequisiteOrdinals ordinals of modules that must be completed before this
 *                          one is unlocked (empty list ⇒ no prerequisites).
 * @param rationale         recommendation rationale payload stored at generation time.
 */
public record PathwayStepView(
        UUID stepId,
        int ordinal,
        UUID moduleRefId,
        UUID moduleEntityId,
        String moduleTitle,
        boolean required,
        ModuleStatus status,
        List<Integer> prerequisiteOrdinals,
        Object rationale
) {
}
