package com.adaptlearngraph.pathway.domain;

/**
 * The display state that governs how the pathway view is presented to the employee.
 *
 * <ul>
 *   <li>{@link #GENERATING} – a recommendation run is still in progress; no step list
 *       available yet.</li>
 *   <li>{@link #PENDING_EXPERT_REVIEW} – an initial pathway revision exists but has not
 *       been approved by a Domain Expert; the employee sees the structure but all learning
 *       actions are gated.</li>
 *   <li>{@link #ACTIVE} – pathway is approved and published; prerequisite-based unlocking
 *       applies.</li>
 *   <li>{@link #FULLY_QUALIFIED} – the employee has zero competency gaps for the target
 *       role; congratulatory state shown instead of a module list.</li>
 *   <li>{@link #STALE} – role configuration has changed since the pathway was generated;
 *       the employee can still learn but a banner is shown.</li>
 * </ul>
 */
public enum PathwayDisplayState {
    GENERATING,
    PENDING_EXPERT_REVIEW,
    ACTIVE,
    FULLY_QUALIFIED,
    STALE
}
