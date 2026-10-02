package com.adaptlearngraph.pathway.application.port.in;

import com.adaptlearngraph.pathway.domain.ArchivedPathwaySnapshot;

import java.util.Optional;
import java.util.UUID;

/**
 * Inbound port for REQ-004-F01: open a specific archived pathway snapshot from the
 * Pathway History tab.
 *
 * <p>The snapshot is read-only and permanently frozen. The caller must ensure the
 * requested pathway belongs to the authenticated employee.
 *
 * @return {@code Optional.empty()} when no archived pathway with that id exists for
 *         the employee.
 */
public interface ViewArchivedPathwayUseCase {
    Optional<ArchivedPathwaySnapshot> viewArchivedPathway(UUID learnerId, UUID pathwayId);
}
