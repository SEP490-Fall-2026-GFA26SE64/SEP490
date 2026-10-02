package com.adaptlearngraph.pathway.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * API response body for the Pathway History list (REQ-004-F01).
 *
 * @param history list of archived pathway summary cards ordered from most recently
 *                archived to oldest.
 */
public record PathwayHistoryResponse(List<ArchivedSummaryResponse> history) {

    /**
     * Summary card for one archived pathway.
     *
     * @param pathwayId             stable pathway id.
     * @param targetRoleName        human-readable role name.
     * @param startedAt             when the employee first selected this role.
     * @param archivedAt            when the role was changed and this pathway archived.
     * @param finalCompletedModules final completed module count at archival.
     * @param finalTotalModules     total module count at archival.
     * @param finalCompletionPercent pre-computed final completion percentage (0–100).
     */
    public record ArchivedSummaryResponse(
            UUID pathwayId,
            String targetRoleName,
            Instant startedAt,
            Instant archivedAt,
            int finalCompletedModules,
            int finalTotalModules,
            int finalCompletionPercent
    ) {}
}
