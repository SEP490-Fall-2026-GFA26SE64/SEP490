package com.adaptlearngraph.repository;

import java.util.Collection;

/** Writes a copied platform catalog subset into one organization's graph. */
public interface WorkspaceCatalogGraphWriter {
    void copy(String organizationId, String templateVersion, Collection<PlatformCatalogTemplate.Node> nodes,
              Collection<PlatformCatalogTemplate.Edge> edges);
}
