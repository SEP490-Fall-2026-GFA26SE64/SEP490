package com.adaptlearngraph.responseDto;

import com.adaptlearngraph.entities.domain.OrganizationKnowledgeGraph;
import java.util.List;

public record OrganizationKnowledgeGraphResponse(List<NodeResponse> nodes, List<EdgeResponse> edges) {
    public record NodeResponse(String id, String label, String name, String code, String description, String status,
                               String reviewStatus) {}

    public record EdgeResponse(String id, String from, String to, String type) {}

    public static OrganizationKnowledgeGraphResponse fromDomain(OrganizationKnowledgeGraph graph) {
        return new OrganizationKnowledgeGraphResponse(
                graph.nodes().stream().map(n -> new NodeResponse(n.id(), n.label(), n.name(), n.code(), n.description(),
                        n.status(), n.reviewStatus())).toList(),
                graph.edges().stream().map(e -> new EdgeResponse(e.id(), e.from(), e.to(), e.type())).toList());
    }
}
