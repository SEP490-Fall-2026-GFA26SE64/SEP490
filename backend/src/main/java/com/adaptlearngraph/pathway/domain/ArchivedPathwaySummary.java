package com.adaptlearngraph.pathway.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * Summary card for one previously archived pathway shown in the Pathway History list.
 *
 * @param pathwayId              stable pathway identifier.
 * @param targetRoleEntityId     entity id of the role this pathway was generated for.
 * @param targetRoleName         human-readable role name.
 * @param startedAt              when the target role selection that started this pathway
 *                               was made.
 * @param archivedAt             when the target-role change occurred and this pathway
 *                               was archived.
 * @param finalCompletedModules  module completion count at archive time.
 * @param finalTotalModules      total module count at archive time.
 */
public record ArchivedPathwaySummary(
        UUID pathwayId,
        UUID targetRoleEntityId,
        String targetRoleName,
        Instant startedAt,
        Instant archivedAt,
        int finalCompletedModules,
        int finalTotalModules
) {
}
