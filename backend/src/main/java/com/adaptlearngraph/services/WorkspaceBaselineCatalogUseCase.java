package com.adaptlearngraph.services;

import java.util.List;

public interface WorkspaceBaselineCatalogUseCase {
    List<Occupation> occupations();
    record Occupation(String id, String name) {}
}
