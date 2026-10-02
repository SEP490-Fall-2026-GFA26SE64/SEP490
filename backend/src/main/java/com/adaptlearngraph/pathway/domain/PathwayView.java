package com.adaptlearngraph.pathway.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * The complete adaptive pathway view for an employee's currently active (or transitional)
 * pathway.
 *
 * <p>The {@link #displayState} field governs how the API consumer should render the
 * response:
 * <ul>
 *   <li>{@link PathwayDisplayState#GENERATING} – the step list is empty; show a progress
 *       indicator with {@link #estimatedReadyAt} if available.</li>
 *   <li>{@link PathwayDisplayState#PENDING_EXPERT_REVIEW} – steps are populated but every
 *       module action is gated; show the "Pending Expert Review" banner.</li>
 *   <li>{@link PathwayDisplayState#ACTIVE} – normal state; apply prerequisite-based
 *       unlocking per step {@link PathwayStepView#status()}.</li>
 *   <li>{@link PathwayDisplayState#FULLY_QUALIFIED} – zero gaps; show the congratulatory
 *       message; {@link #steps} is empty.</li>
 *   <li>{@link PathwayDisplayState#STALE} – same as ACTIVE but show the role-update
 *       banner; content remains accessible.</li>
 * </ul>
 *
 * @param pathwayId          stable pathway identifier (same across revisions).
 * @param pathwayRevisionId  current revision in use for display.
 * @param targetRoleName     human-readable name of the employee's selected target role.
 * @param displayState       presentation state.
 * @param completedModules   count of modules with status {@link ModuleStatus#COMPLETED}.
 * @param totalModules       total number of modules in this pathway.
 * @param microSkillsClosed  number of required micro-skills resolved by completed modules.
 * @param totalMicroSkills   total required micro-skills tracked in the pathway.
 * @param steps              ordered list of pathway steps; may be empty during GENERATING
 *                           or FULLY_QUALIFIED states.
 * @param estimatedReadyAt   estimated generation completion time; non-null only in
 *                           {@link PathwayDisplayState#GENERATING}.
 * @param generatedAt        timestamp when the current pathway revision was created.
 */
public record PathwayView(
        UUID pathwayId,
        UUID pathwayRevisionId,
        String targetRoleName,
        PathwayDisplayState displayState,
        int completedModules,
        int totalModules,
        int microSkillsClosed,
        int totalMicroSkills,
        List<PathwayStepView> steps,
        Instant estimatedReadyAt,
        Instant generatedAt
) {
}
