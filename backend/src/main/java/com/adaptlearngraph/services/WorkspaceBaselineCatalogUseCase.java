package com.adaptlearngraph.services;

import java.util.List;

public interface WorkspaceBaselineCatalogUseCase {
    List<JobPosition> jobPositions();
    record JobPosition(String id, String name) {}
}
