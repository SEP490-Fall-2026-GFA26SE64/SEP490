package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.OrganizationKnowledgeGraph;
import com.adaptlearngraph.repository.OrganizationKnowledgeGraphReader;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/** Organization administrator view of the tenant's ACTIVE knowledge graph. Role checks run in the entitlement filter. */
public final class OrganizationKnowledgeGraphService {
    private final OrganizationKnowledgeGraphReader reader;

    public OrganizationKnowledgeGraphService(OrganizationKnowledgeGraphReader reader) {
        this.reader = Objects.requireNonNull(reader, "reader");
    }

    public OrganizationKnowledgeGraph graph(UUID organizationId) {
        var graph = reader.read(Objects.requireNonNull(organizationId, "organizationId").toString());
        var ids = graph.nodes().stream().map(OrganizationKnowledgeGraph.Node::id).collect(Collectors.toSet());
        // A relationship to an inactive or foreign node would render as a dangling edge.
        var edges = graph.edges().stream().filter(edge -> ids.contains(edge.from()) && ids.contains(edge.to())).toList();
        return new OrganizationKnowledgeGraph(graph.nodes(), edges);
    }
}
