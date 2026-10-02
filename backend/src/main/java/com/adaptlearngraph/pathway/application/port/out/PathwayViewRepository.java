package com.adaptlearngraph.pathway.application.port.out;

import com.adaptlearngraph.pathway.domain.ArchivedPathwaySummary;
import com.adaptlearngraph.pathway.domain.ArchivedPathwaySnapshot;
import com.adaptlearngraph.pathway.domain.PathwayView;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Outbound port that provides read access to pathway view data.
 *
 * <p>Implementations live in the infrastructure layer and must not be referenced from
 * the domain layer.
 */
public interface PathwayViewRepository {

    /**
     * Loads the active (or transitional) pathway view for the given learner.
     *
     * <p>Returns {@code Optional.empty()} when the learner has never selected a target
     * role.
     */
    Optional<PathwayView> findActivePathwayView(UUID learnerId);

    /**
     * Loads all archived pathway summaries for the given learner, ordered from most
     * recently archived to oldest.
     */
    List<ArchivedPathwaySummary> findArchivedPathwaySummaries(UUID learnerId);

    /**
     * Loads the frozen snapshot of a specific archived pathway that belongs to the
     * given learner.
     *
     * @return {@code Optional.empty()} when no archived pathway with that id exists for
     *         the learner.
     */
    Optional<ArchivedPathwaySnapshot> findArchivedPathwaySnapshot(UUID learnerId, UUID pathwayId);
}
