package com.adaptlearngraph.pathway.api;

import com.adaptlearngraph.pathway.domain.ModuleStatus;
import com.adaptlearngraph.pathway.domain.PathwayDisplayState;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * API response body for the active adaptive pathway (REQ-004-F01).
 *
 * @param pathwayId          stable pathway id (null while GENERATING).
 * @param pathwayRevisionId  current revision id (null while GENERATING).
 * @param targetRoleName     employee's selected target role display name.
 * @param displayState       one of: GENERATING, PENDING_EXPERT_REVIEW, ACTIVE,
 *                           FULLY_QUALIFIED, STALE.
 * @param completedModules   modules with status COMPLETED.
 * @param totalModules       total modules in the pathway.
 * @param completionPercent  pre-computed percentage (0–100).
 * @param microSkillsClosed  number of required micro-skills resolved.
 * @param totalMicroSkills   total required micro-skills tracked.
 * @param steps              ordered module steps (empty when GENERATING or
 *                           FULLY_QUALIFIED).
 * @param estimatedReadyAt   estimated generation time (non-null only when
 *                           GENERATING).
 * @param generatedAt        revision creation timestamp.
 */
public record PathwayResponse(
        UUID pathwayId,
        UUID pathwayRevisionId,
        String targetRoleName,
        PathwayDisplayState displayState,
        int completedModules,
        int totalModules,
        int completionPercent,
        int microSkillsClosed,
        int totalMicroSkills,
        List<StepResponse> steps,
        Instant estimatedReadyAt,
        Instant generatedAt
) {

    /**
     * One module step in the pathway response.
     *
     * @param stepId               internal step id.
     * @param ordinal              1-based position in the pathway.
     * @param moduleRefId          catalog reference id of the module.
     * @param moduleEntityId       stable module entity id across catalog releases.
     * @param moduleTitle          human-readable module title.
     * @param required             whether this module is mandatory.
     * @param status               module status (LOCKED, READY, IN_PROGRESS,
     *                             COMPLETED, NEEDS_RETAKE).
     * @param prerequisiteOrdinals ordinal positions of prerequisite modules;
     *                             empty list means no prerequisites.
     */
    public record StepResponse(
            UUID stepId,
            int ordinal,
            UUID moduleRefId,
            UUID moduleEntityId,
            String moduleTitle,
            boolean required,
            ModuleStatus status,
            List<Integer> prerequisiteOrdinals
    ) {}
}
