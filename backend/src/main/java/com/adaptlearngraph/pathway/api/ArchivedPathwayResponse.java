package com.adaptlearngraph.pathway.api;

import com.adaptlearngraph.pathway.domain.ModuleStatus;
import com.adaptlearngraph.pathway.domain.PathwayDisplayState;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * API response body for an archived pathway snapshot opened from the Pathway History
 * tab (REQ-004-F01).
 *
 * <p>The {@code archived} flag is always {@code true}; it is included explicitly so
 * the API consumer does not need to infer it from the URL context. All learning actions
 * must be disabled by the consumer.
 *
 * @param pathwayId             stable pathway id.
 * @param pathwayRevisionId     revision id of the snapshot.
 * @param targetRoleName        human-readable role name.
 * @param archived              always {@code true}; signals that all module actions are
 *                              disabled.
 * @param startedAt             when the employee first selected this role.
 * @param archivedAt            archival timestamp.
 * @param finalCompletedModules completed module count at archive time.
 * @param finalTotalModules     total module count at archive time.
 * @param finalCompletionPercent pre-computed final completion percentage (0–100).
 * @param steps                 frozen, ordered module steps with historical statuses.
 */
public record ArchivedPathwayResponse(
        UUID pathwayId,
        UUID pathwayRevisionId,
        String targetRoleName,
        boolean archived,
        Instant startedAt,
        Instant archivedAt,
        int finalCompletedModules,
        int finalTotalModules,
        int finalCompletionPercent,
        List<StepResponse> steps
) {

    /**
     * One module step in the archived snapshot.
     *
     * @param stepId               internal step id.
     * @param ordinal              1-based position.
     * @param moduleRefId          catalog reference id.
     * @param moduleEntityId       stable entity id.
     * @param moduleTitle          human-readable module title.
     * @param required             whether the module was mandatory.
     * @param status               historical status at archive time.
     * @param prerequisiteOrdinals prerequisite ordinals (may be empty).
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
