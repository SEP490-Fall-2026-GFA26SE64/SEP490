package com.adaptlearngraph.pathway.application;

import com.adaptlearngraph.pathway.application.port.in.ListArchivedPathwaysUseCase;
import com.adaptlearngraph.pathway.application.port.in.ViewActivePathwayUseCase;
import com.adaptlearngraph.pathway.application.port.in.ViewArchivedPathwayUseCase;
import com.adaptlearngraph.pathway.application.port.out.PathwayViewRepository;
import com.adaptlearngraph.pathway.domain.ArchivedPathwaySummary;
import com.adaptlearngraph.pathway.domain.ArchivedPathwaySnapshot;
import com.adaptlearngraph.pathway.domain.PathwayView;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application service implementing REQ-004-F01: View Adaptive Pathway.
 *
 * <p>This service is intentionally thin – all business state derivation (module status
 * computation, display-state resolution) is performed by the infrastructure adapter
 * where the SQL projection executes, keeping the service a pure orchestrator.
 */
public final class PathwayViewService
        implements ViewActivePathwayUseCase, ListArchivedPathwaysUseCase, ViewArchivedPathwayUseCase {

    private final PathwayViewRepository repository;

    public PathwayViewService(PathwayViewRepository repository) {
        this.repository = repository;
    }

    @Override
    public Optional<PathwayView> viewActivePathway(UUID learnerId) {
        return repository.findActivePathwayView(learnerId);
    }

    @Override
    public List<ArchivedPathwaySummary> listArchivedPathways(UUID learnerId) {
        return repository.findArchivedPathwaySummaries(learnerId);
    }

    @Override
    public Optional<ArchivedPathwaySnapshot> viewArchivedPathway(UUID learnerId, UUID pathwayId) {
        return repository.findArchivedPathwaySnapshot(learnerId, pathwayId);
    }
}
