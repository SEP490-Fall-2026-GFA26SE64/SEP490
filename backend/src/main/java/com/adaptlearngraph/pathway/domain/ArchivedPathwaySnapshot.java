package com.adaptlearngraph.pathway.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Complete read-only snapshot of an archived pathway opened from the Pathway History tab.
 *
 * <p>All learning actions (accessing module content, starting assessments) must be
 * disabled by API consumers; this snapshot is permanently frozen at archive time.
 *
 * @param pathwayId             stable pathway identifier.
 * @param pathwayRevisionId     the last revision that was in use when archived.
 * @param targetRoleName        human-readable name of the target role.
 * @param startedAt             when this pathway was first active.
 * @param archivedAt            archival timestamp (target-role change event).
 * @param finalCompletedModules module completion count at archive time.
 * @param finalTotalModules     total modules at archive time.
 * @param steps                 frozen ordered list of module steps with historical
 *                              statuses.
 */
public record ArchivedPathwaySnapshot(
        UUID pathwayId,
        UUID pathwayRevisionId,
        String targetRoleName,
        Instant startedAt,
        Instant archivedAt,
        int finalCompletedModules,
        int finalTotalModules,
        List<PathwayStepView> steps
) {
}
