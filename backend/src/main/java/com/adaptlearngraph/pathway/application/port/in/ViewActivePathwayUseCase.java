package com.adaptlearngraph.pathway.application.port.in;

import com.adaptlearngraph.pathway.domain.PathwayView;

import java.util.Optional;
import java.util.UUID;

/**
 * Inbound port for REQ-004-F01: View Adaptive Pathway (active pathway).
 *
 * <p>Returns the current pathway for the authenticated employee. The returned
 * {@link PathwayView#displayState()} determines how the UI should render the response:
 * <ul>
 *   <li>GENERATING – show generation progress indicator.</li>
 *   <li>PENDING_EXPERT_REVIEW – show structure with gated actions.</li>
 *   <li>ACTIVE – normal prerequisite-based access.</li>
 *   <li>FULLY_QUALIFIED – congratulatory view, no module list.</li>
 *   <li>STALE – active + role-update banner.</li>
 * </ul>
 *
 * @return {@code Optional.empty()} when the employee has never selected a target role
 *         and therefore has no pathway at all.
 */
public interface ViewActivePathwayUseCase {
    Optional<PathwayView> viewActivePathway(UUID learnerId);
}
