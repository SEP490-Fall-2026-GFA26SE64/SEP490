package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.TargetRoleSelectionResult;
import com.adaptlearngraph.entities.TargetRoleSelection;
import com.adaptlearngraph.entities.TargetRoleSnapshot;
import java.time.Instant;
import java.util.UUID;

public final class TargetRoleSelectionResponseMapper {
    private TargetRoleSelectionResponseMapper() {}

    public static SelectionResponse toCurrentResponse(TargetRoleSelection selection) {
        return toResponse(selection, false);
    }

    public static SelectionResponse toResponse(TargetRoleSelectionResult result) {
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
                        snapshot.track()),
                selection.selectedAt(),
                selection.targetRevision(),
                changed);
    }

    public record SelectionResponse(
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
            TargetRoleSnapshot.CareerTrack track) {}
}
