package com.adaptlearngraph.assessment.adaptive.application.port.in;

import java.util.List;

public interface WorkspaceBaselineCatalogUseCase {
    List<Occupation> occupations();
    record Occupation(String id, String name) {}
}
