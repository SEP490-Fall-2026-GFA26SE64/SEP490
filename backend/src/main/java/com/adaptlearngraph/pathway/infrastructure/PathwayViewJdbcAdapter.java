package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.port.out.PathwayViewRepository;
import com.adaptlearngraph.pathway.domain.*;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;

/**
 * JDBC adapter that reads pathway view data from the PostgreSQL relational schema.
 *
 * <h3>Module status derivation</h3>
 * <ol>
 *   <li><b>COMPLETED</b> – a {@code module_completion} row exists for the activity.</li>
 *   <li><b>NEEDS_RETAKE</b> – at least one assessment result row exists for a required
 *       assessment of this activity but no passing completion has been recorded.</li>
 *   <li><b>IN_PROGRESS</b> – an active (non-revoked, non-closed) assessment assignment
 *       exists for a required assessment without any result yet.</li>
 *   <li><b>LOCKED</b> – prerequisite ordinals have not all been completed (stub: ordinals
 *       are resolved from the catalog graph; the current implementation returns READY
 *       until the cross-store prerequisite cache is wired).</li>
 *   <li><b>READY</b> – none of the above conditions apply.</li>
 * </ol>
 *
 * <h3>Display state derivation</h3>
 * <ul>
 *   <li>No active {@code target_selection} → {@code Optional.empty()}.</li>
 *   <li>Active selection, pending/running recommendation run, no revision →
 *       {@link PathwayDisplayState#GENERATING}.</li>
 *   <li>Revision with {@code status IN ('GENERATED','IN_REVIEW')} and no approval →
 *       {@link PathwayDisplayState#PENDING_EXPERT_REVIEW}.</li>
 *   <li>Published revision with {@code validation_status = 'STALE'} →
 *       {@link PathwayDisplayState#STALE}.</li>
 *   <li>Published revision, zero steps (no competency gaps) →
 *       {@link PathwayDisplayState#FULLY_QUALIFIED}.</li>
 *   <li>Otherwise → {@link PathwayDisplayState#ACTIVE}.</li>
 * </ul>
 */
public final class PathwayViewJdbcAdapter implements PathwayViewRepository {

    private final JdbcClient jdbc;
    private final CatalogNameResolver nameResolver;

    public PathwayViewJdbcAdapter(JdbcClient jdbc, CatalogNameResolver nameResolver) {
        this.jdbc = jdbc;
        this.nameResolver = nameResolver;
    }

    // ------------------------------------------------------------------
    // ViewActivePathwayUseCase
    // ------------------------------------------------------------------

    @Override
    public Optional<PathwayView> findActivePathwayView(UUID learnerId) {

        record HeaderRow(
                UUID pathwayId, UUID revisionId, UUID roleEntityId,
                String revisionStatus, String validationStatus, UUID approvalId,
                Instant revisionCreatedAt
        ) {}

        Optional<HeaderRow> header = jdbc.sql("""
                SELECT
                    ts.selection_id,
                    cr.entity_id            AS role_entity_id,
                    pr.pathway_id,
                    pr.pathway_revision_id,
                    pr.status               AS revision_status,
                    pr.validation_status,
                    pr.created_at           AS revision_created_at,
                    pa.approval_id
                FROM platform.target_selection ts
                JOIN platform.catalog_reference cr ON cr.catalog_ref_id = ts.role_ref_id
                LEFT JOIN platform.pathway_revision pr
                    ON pr.learner_id    = ts.learner_id
                    AND pr.selection_id = ts.selection_id
                    AND pr.status       = 'PUBLISHED_CURRENT'
                LEFT JOIN platform.pathway_approval pa
                    ON pa.pathway_revision_id = pr.pathway_revision_id
                WHERE ts.learner_id = :learnerId
                  AND ts.ended_at IS NULL
                LIMIT 1
                """)
                .param("learnerId", learnerId)
                .query((rs, n) -> new HeaderRow(
                        rs.getObject("pathway_id", UUID.class),
                        rs.getObject("pathway_revision_id", UUID.class),
                        rs.getObject("role_entity_id", UUID.class),
                        rs.getString("revision_status"),
                        rs.getString("validation_status"),
                        rs.getObject("approval_id", UUID.class),
                        rs.getObject("pathway_revision_id", UUID.class) != null
                                ? rs.getTimestamp("revision_created_at").toInstant()
                                : null
                ))
                .optional();

        if (header.isEmpty()) {
            return Optional.empty();     // No active target role at all.
        }

        var h = header.get();

        if (h.revisionId() == null) {
            // Active selection exists but no published revision yet.
            return Optional.of(buildGeneratingView());
        }

        List<PathwayStepView> steps = loadSteps(h.revisionId(), learnerId, false);
        PathwayDisplayState displayState = resolveDisplayState(
                h.revisionStatus(), h.validationStatus(), h.approvalId(), steps);
        int[] skills = countMicroSkills(h.revisionId());
        int completed = (int) steps.stream().filter(s -> s.status() == ModuleStatus.COMPLETED).count();

        return Optional.of(new PathwayView(
                h.pathwayId(),
                h.revisionId(),
                nameResolver.resolveRoleName(h.roleEntityId()),
                displayState,
                completed,
                steps.size(),
                skills[0],
                skills[1],
                steps,
                null,
                h.revisionCreatedAt()
        ));
    }

    // ------------------------------------------------------------------
    // ListArchivedPathwaysUseCase
    // ------------------------------------------------------------------

    @Override
    public List<ArchivedPathwaySummary> findArchivedPathwaySummaries(UUID learnerId) {
        return jdbc.sql("""
                SELECT
                    pr.pathway_id,
                    cr.entity_id    AS role_entity_id,
                    ts.selected_at,
                    ts.ended_at     AS archived_at,
                    COALESCE((
                        SELECT COUNT(DISTINCT mc.activity_id)
                        FROM platform.pathway_step ps2
                        JOIN platform.module_completion mc ON mc.activity_id = ps2.activity_id
                        WHERE ps2.pathway_revision_id = pr.pathway_revision_id
                    ), 0)::int      AS completed_count,
                    COALESCE((
                        SELECT COUNT(*) FROM platform.pathway_step ps3
                        WHERE ps3.pathway_revision_id = pr.pathway_revision_id
                    ), 0)::int      AS total_count
                FROM platform.target_selection ts
                JOIN platform.catalog_reference cr ON cr.catalog_ref_id = ts.role_ref_id
                JOIN platform.pathway_revision pr
                    ON pr.learner_id    = ts.learner_id
                    AND pr.selection_id = ts.selection_id
                    AND pr.status       = 'SUPERSEDED'
                WHERE ts.learner_id  = :learnerId
                  AND ts.ended_at IS NOT NULL
                ORDER BY ts.ended_at DESC
                """)
                .param("learnerId", learnerId)
                .query((rs, n) -> new ArchivedPathwaySummary(
                        rs.getObject("pathway_id", UUID.class),
                        rs.getObject("role_entity_id", UUID.class),
                        nameResolver.resolveRoleName(rs.getObject("role_entity_id", UUID.class)),
                        rs.getTimestamp("selected_at").toInstant(),
                        rs.getTimestamp("archived_at").toInstant(),
                        rs.getInt("completed_count"),
                        rs.getInt("total_count")
                ))
                .list();
    }

    // ------------------------------------------------------------------
    // ViewArchivedPathwayUseCase
    // ------------------------------------------------------------------

    @Override
    public Optional<ArchivedPathwaySnapshot> findArchivedPathwaySnapshot(
            UUID learnerId, UUID pathwayId) {

        record ArchiveMeta(UUID revisionId, UUID roleEntityId, Instant startedAt, Instant archivedAt) {}

        Optional<ArchiveMeta> meta = jdbc.sql("""
                SELECT
                    pr.pathway_revision_id,
                    cr.entity_id    AS role_entity_id,
                    ts.selected_at,
                    ts.ended_at     AS archived_at
                FROM platform.pathway_revision pr
                JOIN platform.target_selection ts
                    ON ts.selection_id = pr.selection_id
                    AND ts.learner_id  = pr.learner_id
                JOIN platform.catalog_reference cr ON cr.catalog_ref_id = ts.role_ref_id
                WHERE pr.learner_id = :learnerId
                  AND pr.pathway_id = :pathwayId
                  AND pr.status     = 'SUPERSEDED'
                  AND ts.ended_at IS NOT NULL
                ORDER BY pr.revision DESC
                LIMIT 1
                """)
                .param("learnerId", learnerId)
                .param("pathwayId", pathwayId)
                .query((rs, n) -> new ArchiveMeta(
                        rs.getObject("pathway_revision_id", UUID.class),
                        rs.getObject("role_entity_id", UUID.class),
                        rs.getTimestamp("selected_at").toInstant(),
                        rs.getTimestamp("archived_at").toInstant()
                ))
                .optional();

        if (meta.isEmpty()) return Optional.empty();

        var m = meta.get();
        List<PathwayStepView> steps = loadSteps(m.revisionId(), learnerId, true);
        int completed = (int) steps.stream().filter(s -> s.status() == ModuleStatus.COMPLETED).count();

        return Optional.of(new ArchivedPathwaySnapshot(
                pathwayId,
                m.revisionId(),
                nameResolver.resolveRoleName(m.roleEntityId()),
                m.startedAt(),
                m.archivedAt(),
                completed,
                steps.size(),
                steps
        ));
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    private List<PathwayStepView> loadSteps(UUID revisionId, UUID learnerId, boolean frozen) {

        record StepRow(
                UUID stepId, int ordinal, UUID moduleRefId, UUID moduleEntityId,
                boolean required, boolean isCompleted, boolean hasAttempt,
                boolean hasActiveAssignment, Object rationale
        ) {}

        var rows = jdbc.sql("""
                SELECT
                    ps.step_id,
                    ps.ordinal,
                    ps.required,
                    ps.rationale,
                    la.activity_id,
                    cr.entity_id            AS module_entity_id,
                    cr.catalog_ref_id       AS module_ref_id,
                    (mc.activity_id IS NOT NULL)                                AS is_completed,
                    EXISTS (
                        SELECT 1
                        FROM platform.assessment_result ar
                        JOIN platform.assessment_attempt aa ON aa.attempt_id = ar.attempt_id
                        JOIN platform.activity_requirement aqr
                            ON aqr.activity_id = la.activity_id
                            AND aqr.assessment_version_id = aa.assessment_version_id
                            AND aqr.required
                        WHERE aa.activity_id = la.activity_id
                    )                                                           AS has_attempt,
                    EXISTS (
                        SELECT 1
                        FROM platform.assessment_assignment asgn
                        JOIN platform.activity_requirement aqr
                            ON aqr.activity_id = la.activity_id
                            AND aqr.assessment_version_id = asgn.assessment_version_id
                            AND aqr.required
                        WHERE asgn.activity_id = la.activity_id
                          AND asgn.learner_id  = :learnerId
                          AND asgn.status      = 'ACTIVE'
                    )                                                           AS has_active_assignment
                FROM platform.pathway_step ps
                JOIN platform.learning_activity la ON la.activity_id = ps.activity_id
                JOIN platform.catalog_reference cr ON cr.catalog_ref_id = la.module_ref_id
                LEFT JOIN platform.module_completion mc ON mc.activity_id = la.activity_id
                WHERE ps.pathway_revision_id = :revisionId
                ORDER BY ps.ordinal
                """)
                .param("revisionId", revisionId)
                .param("learnerId", learnerId)
                .query((rs, n) -> new StepRow(
                        rs.getObject("step_id", UUID.class),
                        rs.getInt("ordinal"),
                        rs.getObject("module_ref_id", UUID.class),
                        rs.getObject("module_entity_id", UUID.class),
                        rs.getBoolean("required"),
                        rs.getBoolean("is_completed"),
                        rs.getBoolean("has_attempt"),
                        rs.getBoolean("has_active_assignment"),
                        rs.getObject("rationale")
                ))
                .list();

        return rows.stream()
                .map(row -> {
                    ModuleStatus status = deriveStatus(row.isCompleted(), row.hasAttempt(),
                            row.hasActiveAssignment(), frozen);
                    return new PathwayStepView(
                            row.stepId(),
                            row.ordinal(),
                            row.moduleRefId(),
                            row.moduleEntityId(),
                            nameResolver.resolveModuleTitle(row.moduleRefId()),
                            row.required(),
                            status,
                            List.of(), // prerequisite ordinals resolved by catalog graph endpoint
                            row.rationale()
                    );
                })
                .toList();
    }

    private static ModuleStatus deriveStatus(
            boolean completed, boolean hasAttempt, boolean hasActiveAssignment, boolean frozen) {
        if (completed) return ModuleStatus.COMPLETED;
        if (hasAttempt) return ModuleStatus.NEEDS_RETAKE;
        if (!frozen && hasActiveAssignment) return ModuleStatus.IN_PROGRESS;
        return ModuleStatus.READY;
    }

    private static PathwayDisplayState resolveDisplayState(
            String revisionStatus, String validationStatus, UUID approvalId,
            List<PathwayStepView> steps) {
        if (revisionStatus == null) return PathwayDisplayState.GENERATING;
        if ("GENERATED".equals(revisionStatus) || "IN_REVIEW".equals(revisionStatus)) {
            return PathwayDisplayState.PENDING_EXPERT_REVIEW;
        }
        if ("PUBLISHED_CURRENT".equals(revisionStatus) && "STALE".equals(validationStatus)) {
            return PathwayDisplayState.STALE;
        }
        if ("PUBLISHED_CURRENT".equals(revisionStatus) && steps.isEmpty()) {
            return PathwayDisplayState.FULLY_QUALIFIED;
        }
        return PathwayDisplayState.ACTIVE;
    }

    private static PathwayView buildGeneratingView() {
        return new PathwayView(null, null, null,
                PathwayDisplayState.GENERATING,
                0, 0, 0, 0, List.of(), null, null);
    }

    private int[] countMicroSkills(UUID revisionId) {
        return jdbc.sql("""
                SELECT
                    COUNT(DISTINCT ism.skill_ref_id) FILTER (
                        WHERE mc.activity_id IS NOT NULL
                    )::int  AS closed_skills,
                    COUNT(DISTINCT ism.skill_ref_id)::int AS total_skills
                FROM platform.pathway_step ps
                JOIN platform.learning_activity la ON la.activity_id = ps.activity_id
                JOIN platform.activity_requirement aqr
                    ON aqr.activity_id = la.activity_id AND aqr.required
                JOIN platform.assessment_item ai
                    ON ai.assessment_version_id = aqr.assessment_version_id
                JOIN platform.item_skill_mapping ism
                    ON ism.item_version_id = ai.item_version_id
                LEFT JOIN platform.module_completion mc ON mc.activity_id = la.activity_id
                WHERE ps.pathway_revision_id = :revisionId
                """)
                .param("revisionId", revisionId)
                .query((rs, n) -> new int[]{rs.getInt("closed_skills"), rs.getInt("total_skills")})
                .single();
    }
}
