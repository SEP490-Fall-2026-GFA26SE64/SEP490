package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.OrganizationStructure;
import java.time.Instant;

/** Writes a Guest-imported organization structure into one organization's graph. */
public interface WorkspaceCatalogGraphWriter {
    void writeStructure(String organizationId, OrganizationStructure structure, Instant now);
}
