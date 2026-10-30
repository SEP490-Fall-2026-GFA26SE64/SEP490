package com.adaptlearngraph.learning.infrastructure;

import com.adaptlearngraph.learning.application.port.out.PathwayArchivePort;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Local/demo mapping of pathway archive semantics to the provisional SUPERSEDED status. */
public final class JdbcProvisionalPathwayArchiveAdapter implements PathwayArchivePort {
    private static final String SUPERSEDE_CURRENT_PATHWAY = """
            UPDATE platform.pathway_revision
            SET status = 'SUPERSEDED'
            WHERE learner_id = :learnerId
              AND selection_id = :selectionId
              AND status = 'PUBLISHED_CURRENT'
            """;

    private static final String HAS_OTHER_CURRENT_PATHWAY = """
            SELECT EXISTS (
                SELECT 1
                FROM platform.pathway_revision
                WHERE learner_id = :learnerId
                  AND selection_id <> :selectionId
                  AND status = 'PUBLISHED_CURRENT')
            """;

    private final NamedParameterJdbcTemplate jdbc;

    JdbcProvisionalPathwayArchiveAdapter(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = Objects.requireNonNull(jdbc, "jdbc must not be null");
    }

    @Override
    public ArchiveOutcome archiveCurrentPathway(
            UUID learnerId,
            UUID selectionId,
            Instant archivedAt) {
        requireIdentity(learnerId, "learnerId");
        requireIdentity(selectionId, "selectionId");
        Objects.requireNonNull(archivedAt, "archivedAt must not be null");

        Map<String, UUID> scope = Map.of(
                "learnerId", learnerId,
                "selectionId", selectionId);
        int archived = jdbc.update(SUPERSEDE_CURRENT_PATHWAY, scope);
        if (archived == 1) {
            return ArchiveOutcome.ARCHIVED;
        }
        if (archived > 1) {
            throw unavailable("More than one current pathway matched the learner and selection");
        }

        Boolean mismatchedCurrent = jdbc.queryForObject(
                HAS_OTHER_CURRENT_PATHWAY,
                scope,
                Boolean.class);
        if (Boolean.TRUE.equals(mismatchedCurrent)) {
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
