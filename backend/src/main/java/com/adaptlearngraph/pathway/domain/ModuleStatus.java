package com.adaptlearngraph.pathway.domain;

/**
 * The five defined statuses that a pathway module step can be in.
 *
 * <ul>
 *   <li>{@link #LOCKED} – at least one prerequisite module has not yet been completed.</li>
 *   <li>{@link #READY} – all prerequisites are satisfied; available to start learning.</li>
 *   <li>{@link #IN_PROGRESS} – learning materials have been accessed or an assessment is
 *       in progress.</li>
 *   <li>{@link #COMPLETED} – module assessment passed; targeted micro-skill gaps are
 *       closed.</li>
 *   <li>{@link #NEEDS_RETAKE} – assessment was submitted but did not meet the pass
 *       threshold.</li>
 * </ul>
 */
public enum ModuleStatus {
    LOCKED,
    READY,
    IN_PROGRESS,
    COMPLETED,
    NEEDS_RETAKE
}
