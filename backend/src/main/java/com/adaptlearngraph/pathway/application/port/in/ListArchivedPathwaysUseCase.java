package com.adaptlearngraph.pathway.application.port.in;

import com.adaptlearngraph.pathway.domain.ArchivedPathwaySummary;

import java.util.List;
import java.util.UUID;

/**
 * Inbound port for REQ-004-F01: list all archived (historical) pathways for an employee.
 *
 * <p>Each item in the returned list corresponds to one previously active pathway that was
 * archived when the employee changed their target role. The list is ordered from most
 * recently archived to oldest.
 */
public interface ListArchivedPathwaysUseCase {
    List<ArchivedPathwaySummary> listArchivedPathways(UUID learnerId);
}
