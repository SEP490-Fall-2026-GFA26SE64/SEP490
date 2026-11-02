package com.adaptlearngraph.repository;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Local/demo mapping of pathway archive semantics to the provisional SUPERSEDED status. */
public final class JpaProvisionalPathwayArchiveAdapter implements PathwayArchivePort {
    private final PathwayRevisionJpaRepository pathways;

    public JpaProvisionalPathwayArchiveAdapter(PathwayRevisionJpaRepository pathways) {
        this.pathways = Objects.requireNonNull(pathways, "pathways must not be null");
    }

    @Override
    public ArchiveOutcome archiveCurrentPathway(
            UUID learnerId,
            UUID selectionId,
            Instant archivedAt) {
        requireIdentity(learnerId, "learnerId");
        requireIdentity(selectionId, "selectionId");
        Objects.requireNonNull(archivedAt, "archivedAt must not be null");

        int archived = pathways.supersedeCurrent(learnerId, selectionId);
        if (archived == 1) {
            return ArchiveOutcome.ARCHIVED;
        }
        if (archived > 1) {
            throw unavailable("More than one current pathway matched the learner and selection");
        }

        if (pathways.hasOtherCurrent(learnerId, selectionId)) {
            throw unavailable("The learner's current pathway belongs to another target selection");
        }
        return ArchiveOutcome.NO_PATHWAY;
    }

    private static UUID requireIdentity(UUID value, String field) {
        Objects.requireNonNull(value, field + " must not be null");
        if (value.equals(new UUID(0L, 0L))) {
            throw new IllegalArgumentException(field + " must not be the nil UUID");
        }
        return value;
    }

    private static PathwayArchiveException unavailable(String message) {
        return new PathwayArchiveException(message, new IllegalStateException(message));
    }
}
