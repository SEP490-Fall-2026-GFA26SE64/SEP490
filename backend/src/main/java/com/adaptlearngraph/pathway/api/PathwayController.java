package com.adaptlearngraph.pathway.api;

import com.adaptlearngraph.pathway.application.port.in.ListArchivedPathwaysUseCase;
import com.adaptlearngraph.pathway.application.port.in.ViewActivePathwayUseCase;
import com.adaptlearngraph.pathway.application.port.in.ViewArchivedPathwayUseCase;
import com.adaptlearngraph.pathway.domain.ArchivedPathwaySummary;
import com.adaptlearngraph.pathway.domain.ArchivedPathwaySnapshot;
import com.adaptlearngraph.pathway.domain.PathwayStepView;
import com.adaptlearngraph.pathway.domain.PathwayView;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for REQ-004-F01: View Adaptive Pathway.
 *
 * <h3>Endpoints</h3>
 * <ul>
 *   <li>{@code GET /api/v1/me/pathway} – active (or transitional) pathway view.</li>
 *   <li>{@code GET /api/v1/me/pathway/history} – list of archived pathway summary
 *       cards.</li>
 *   <li>{@code GET /api/v1/me/pathway/history/{pathwayId}} – frozen snapshot of a
 *       specific archived pathway.</li>
 * </ul>
 *
 * <p>Authentication: all endpoints require the caller to be authenticated as an
 * employee. The learner id is derived from the authenticated principal's name (which is
 * the account_id UUID set during login).
 */
@RestController
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RequestMapping("/api/v1/me/pathway")
public class PathwayController {

    private final ViewActivePathwayUseCase viewActivePathway;
    private final ListArchivedPathwaysUseCase listArchivedPathways;
    private final ViewArchivedPathwayUseCase viewArchivedPathway;

    public PathwayController(
            ViewActivePathwayUseCase viewActivePathway,
            ListArchivedPathwaysUseCase listArchivedPathways,
            ViewArchivedPathwayUseCase viewArchivedPathway) {
        this.viewActivePathway = viewActivePathway;
        this.listArchivedPathways = listArchivedPathways;
        this.viewArchivedPathway = viewArchivedPathway;
    }

    /**
     * Returns the employee's current adaptive pathway.
     *
     * <p>Response codes:
     * <ul>
     *   <li>200 – pathway exists (check {@code displayState} for special states).</li>
     *   <li>204 – no pathway exists (employee has never selected a target role).</li>
     * </ul>
     */
    @GetMapping
    public ResponseEntity<PathwayResponse> getActivePathway(Principal principal) {
        UUID learnerId = UUID.fromString(principal.getName());
        return viewActivePathway.viewActivePathway(learnerId)
                .map(view -> ResponseEntity.ok(toResponse(view)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * Returns the Pathway History list for the authenticated employee.
     *
     * <p>Always returns 200 with an empty list when no pathways have been archived.
     */
    @GetMapping("/history")
    public PathwayHistoryResponse getPathwayHistory(Principal principal) {
        UUID learnerId = UUID.fromString(principal.getName());
        List<ArchivedPathwaySummary> summaries = listArchivedPathways.listArchivedPathways(learnerId);
        List<PathwayHistoryResponse.ArchivedSummaryResponse> cards = summaries.stream()
                .map(this::toSummaryResponse)
                .toList();
        return new PathwayHistoryResponse(cards);
    }

    /**
     * Opens a specific archived pathway snapshot from the employee's history.
     *
     * <p>Response codes:
     * <ul>
     *   <li>200 – archived snapshot found; {@code archived} is always {@code true}.</li>
     *   <li>404 – pathway does not exist or does not belong to this employee.</li>
     * </ul>
     */
    @GetMapping("/history/{pathwayId}")
    public ResponseEntity<ArchivedPathwayResponse> getArchivedPathway(
            @PathVariable UUID pathwayId, Principal principal) {
        UUID learnerId = UUID.fromString(principal.getName());
        return viewArchivedPathway.viewArchivedPathway(learnerId, pathwayId)
                .map(snapshot -> ResponseEntity.ok(toArchivedResponse(snapshot)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ------------------------------------------------------------------
    // Mapping helpers (domain → API response)
    // ------------------------------------------------------------------

    private PathwayResponse toResponse(PathwayView view) {
        int percent = view.totalModules() == 0 ? 0
                : (int) Math.round(100.0 * view.completedModules() / view.totalModules());
        return new PathwayResponse(
                view.pathwayId(),
                view.pathwayRevisionId(),
                view.targetRoleName(),
                view.displayState(),
                view.completedModules(),
                view.totalModules(),
                percent,
                view.microSkillsClosed(),
                view.totalMicroSkills(),
                view.steps().stream().map(this::toStepResponse).toList(),
                view.estimatedReadyAt(),
                view.generatedAt()
        );
    }

    private PathwayResponse.StepResponse toStepResponse(PathwayStepView step) {
        return new PathwayResponse.StepResponse(
                step.stepId(),
                step.ordinal(),
                step.moduleRefId(),
                step.moduleEntityId(),
                step.moduleTitle(),
                step.required(),
                step.status(),
                step.prerequisiteOrdinals()
        );
    }

    private PathwayHistoryResponse.ArchivedSummaryResponse toSummaryResponse(
            ArchivedPathwaySummary summary) {
        int percent = summary.finalTotalModules() == 0 ? 0
                : (int) Math.round(100.0 * summary.finalCompletedModules() / summary.finalTotalModules());
        return new PathwayHistoryResponse.ArchivedSummaryResponse(
                summary.pathwayId(),
                summary.targetRoleName(),
                summary.startedAt(),
                summary.archivedAt(),
                summary.finalCompletedModules(),
                summary.finalTotalModules(),
                percent
        );
    }

    private ArchivedPathwayResponse toArchivedResponse(ArchivedPathwaySnapshot snapshot) {
        int percent = snapshot.finalTotalModules() == 0 ? 0
                : (int) Math.round(100.0 * snapshot.finalCompletedModules() / snapshot.finalTotalModules());
        List<ArchivedPathwayResponse.StepResponse> steps = snapshot.steps().stream()
                .map(step -> new ArchivedPathwayResponse.StepResponse(
                        step.stepId(),
                        step.ordinal(),
                        step.moduleRefId(),
                        step.moduleEntityId(),
                        step.moduleTitle(),
                        step.required(),
                        step.status(),
                        step.prerequisiteOrdinals()
                ))
                .toList();
        return new ArchivedPathwayResponse(
                snapshot.pathwayId(),
                snapshot.pathwayRevisionId(),
                snapshot.targetRoleName(),
                true,
                snapshot.startedAt(),
                snapshot.archivedAt(),
                snapshot.finalCompletedModules(),
                snapshot.finalTotalModules(),
                percent,
                steps
        );
    }
}
