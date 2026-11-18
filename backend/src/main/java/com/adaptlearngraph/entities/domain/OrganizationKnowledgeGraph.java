package com.adaptlearngraph.entities.domain;

import java.util.List;

/** Read-only snapshot of one organization's ACTIVE catalog graph for administrator visualisation. */
public record OrganizationKnowledgeGraph(List<Node> nodes, List<Edge> edges) {
    /** Labels in hierarchy order; a node carrying several of them is reported under the first match. */
    public static final List<String> LABELS = List.of("JobPosition", "TargetRole", "Level", "Competency", "MicroSkill",
            "LearningModule", "Certificate");
    public static final List<String> RELATIONSHIPS = List.of("HAS_ROLE", "HAS_LEVEL", "HAS_COMPETENCY", "HAS_SKILL",
            "REQUIRES_SKILL", "HAS_SKILL_PREREQUISITE", "TEACHES", "REQUIRES_CERTIFICATE");

    public OrganizationKnowledgeGraph {
        nodes = List.copyOf(nodes);
        edges = List.copyOf(edges);
    }

    public record Node(String id, String label, String name, String code, String description, String status,
                       String reviewStatus) {}

    public record Edge(String id, String from, String to, String type) {}
}
