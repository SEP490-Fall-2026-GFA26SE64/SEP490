package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.OrganizationKnowledgeGraph;

/** Reads the ACTIVE catalog nodes and relationships owned by one organization. */
public interface OrganizationKnowledgeGraphReader {
    OrganizationKnowledgeGraph read(String organizationId);
}
