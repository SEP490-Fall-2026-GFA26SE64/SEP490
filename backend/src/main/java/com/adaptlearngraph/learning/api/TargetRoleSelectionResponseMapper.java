package com.adaptlearngraph.learning.api;

import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionResult;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot;
import java.time.Instant;
import java.util.UUID;

final class TargetRoleSelectionResponseMapper {
    private TargetRoleSelectionResponseMapper() {}

    static SelectionResponse toCurrentResponse(TargetRoleSelection selection) {
        return toResponse(selection, false);
    }

    static SelectionResponse toResponse(TargetRoleSelectionResult result) {
        return toResponse(result.selection(), result.changed());
    }

    private static SelectionResponse toResponse(TargetRoleSelection selection, boolean changed) {
        TargetRoleSnapshot snapshot = selection.roleSnapshot();
        return new SelectionResponse(
                selection.selectionId(),
                snapshot.id(),
                new RoleSnapshotResponse(
                        snapshot.id(),
                        snapshot.code(),
                        snapshot.name(),
                        snapshot.track(),
                        snapshot.seniority()),
                selection.selectedAt(),
                selection.targetRevision(),
                changed);
    }

    record SelectionResponse(
            UUID selectionId,
            UUID roleId,
            RoleSnapshotResponse roleSnapshot,
            Instant selectedAt,
            long targetRevision,
            boolean changed) {}

    record RoleSnapshotResponse(
            UUID id,
            String code,
            String name,
            TargetRoleSnapshot.CareerTrack track,
            TargetRoleSnapshot.Seniority seniority) {}
}
