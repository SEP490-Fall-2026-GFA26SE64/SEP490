package com.adaptlearngraph.learning.application.port.out;

import java.time.Instant;
import java.util.UUID;

/** Archives the current pathway owned by the selection being replaced. */
public interface PathwayArchivePort {
    ArchiveOutcome archiveCurrentPathway(
            UUID learnerId,
            UUID selectionId,
            Instant archivedAt);

    enum ArchiveOutcome {
        NO_PATHWAY,
        ARCHIVED
    }

    final class PathwayArchiveException extends RuntimeException {
        public PathwayArchiveException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
