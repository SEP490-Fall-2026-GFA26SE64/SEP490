package com.adaptlearngraph.services;

import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.repository.PlatformCatalogTemplate;
import com.adaptlearngraph.repository.PlatformCatalogTemplate.Edge;
import com.adaptlearngraph.repository.PlatformCatalogTemplate.Node;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Supplier;

/**
 * Read-only access to the platform template and the dependency closure copied into a new organization.
 * The client expands branches into explicit selections. Only structural ancestors and skill prerequisites are
 * mandatory: selecting a parent must never restore descendants that the Guest deliberately removed.
 */
public final class PlatformCatalogService {
    public static final Set<String> SELECTABLE = Set.of("JobPosition", "TargetRole", "Level", "Competency", "MicroSkill");
    private static final Set<String> RELATIONSHIPS = Set.of("HAS_ROLE", "HAS_LEVEL", "HAS_COMPETENCY",
            "HAS_SKILL", "REQUIRES_SKILL", "HAS_SKILL_PREREQUISITE");
    public static final int MAX_SELECTION = 300;

    public record GraphNode(String id, String label, String name, String code, String description) {}
    public record GraphEdge(String id, String from, String to, String type, Map<String, Object> properties) {}
    public record Graph(String version, String sha256, List<GraphNode> nodes, List<GraphEdge> edges) {}
    public record Inclusion(String nodeId, String reason, String requiredBy) {}
    public record Closure(String templateVersion, String templateSha256, List<String> selected, Set<String> nodeIds,
                          List<Edge> edges, Map<String, Integer> nodesByLabel, List<Inclusion> inclusions) {
        public int nodeCount() { return nodeIds.size(); }
        public int relationshipCount() { return edges.size(); }
    }

    private final Supplier<Optional<PlatformCatalogTemplate>> templates;
    private volatile Index index;

    public PlatformCatalogService(Supplier<Optional<PlatformCatalogTemplate>> templates) {
        this.templates = templates;
    }

    public Graph graph() {
        var current = index();
        var template = current.template;
        var nodes = template.nodes().values().stream().filter(n -> SELECTABLE.contains(n.label()))
                .map(n -> new GraphNode(n.id(), n.label(), n.displayName(), n.code(),
                        n.properties().get("description") instanceof String description ? description : null)).toList();
        var ids = nodes.stream().map(GraphNode::id).collect(java.util.stream.Collectors.toSet());
        var edges = template.edges().stream().filter(e -> RELATIONSHIPS.contains(e.type())
                && ids.contains(e.fromId()) && ids.contains(e.toId())).map(PlatformCatalogService::graphEdge).toList();
        return new Graph(template.version(), template.sha256(), nodes, edges);
    }

    public static GraphEdge graphEdge(Edge edge) {
        var properties = new LinkedHashMap<String, Object>();
        for (String key : List.of("requiredKnowledgeLevels", "dependentKnowledgeLevel", "prerequisiteKnowledgeLevel",
                "isMandatory", "requiredScore")) {
            if (edge.properties().containsKey(key)) properties.put(key, edge.properties().get(key));
        }
        return new GraphEdge(edge.id() == null ? edge.type() + ":" + edge.fromId() + ":" + edge.toId() : edge.id(),
                edge.fromId(), edge.toId(), edge.type(), java.util.Collections.unmodifiableMap(properties));
    }

    /** Validates a guest selection and returns the closure that would be copied; an empty selection copies nothing. */
    public Closure closure(Collection<String> selection) {
        List<String> selected = normalize(selection);
        if (selected.isEmpty()) {
            var template = templates.get();
            return new Closure(template.map(PlatformCatalogTemplate::version).orElse(null),
                    template.map(PlatformCatalogTemplate::sha256).orElse(null), List.of(), Set.of(), List.of(), Map.of(), List.of());
        }
        var current = index();
        for (String id : selected) {
            Node node = current.template.nodes().get(id);
            if (node == null || !SELECTABLE.contains(node.label()))
                throw RegistrationFailure.invalid("catalogSelection", "Select catalog items from the platform template.");
        }
        var nodes = new LinkedHashSet<>(selected);
        var inclusions = new LinkedHashSet<Inclusion>();
        var pending = new ArrayDeque<>(selected);
        while (!pending.isEmpty()) {
            String id = pending.removeFirst();
            String parentEdge = switch (current.template.nodes().get(id).label()) {
                case "TargetRole" -> "HAS_ROLE";
                case "Level" -> "HAS_LEVEL";
                case "Competency" -> "HAS_COMPETENCY";
                default -> null;
            };
            if (parentEdge != null) {
                for (String parent : current.in(parentEdge, id))
                    include(parent, id, "ANCESTOR", selected, nodes, inclusions, pending);
            }
            if ("MicroSkill".equals(current.template.nodes().get(id).label()))
                for (String prerequisite : current.out("HAS_SKILL_PREREQUISITE", id))
                    include(prerequisite, id, "PREREQUISITE", selected, nodes, inclusions, pending);
        }
        var edges = current.template.edges().stream()
                .filter(edge -> RELATIONSHIPS.contains(edge.type())
                        && nodes.contains(edge.fromId()) && nodes.contains(edge.toId())).toList();
        var byLabel = new TreeMap<String, Integer>();
        nodes.forEach(id -> byLabel.merge(current.template.nodes().get(id).label(), 1, Integer::sum));
        return new Closure(current.template.version(), current.template.sha256(), selected,
                java.util.Collections.unmodifiableSet(nodes), edges, java.util.Collections.unmodifiableMap(byLabel), List.copyOf(inclusions));
    }

    private static void include(String id, String requiredBy, String reason, List<String> selected, Set<String> nodes,
                                Set<Inclusion> inclusions, ArrayDeque<String> pending) {
        if (!selected.contains(id)) inclusions.add(new Inclusion(id, reason, requiredBy));
        if (nodes.add(id)) pending.addLast(id);
    }

    public Optional<PlatformCatalogTemplate> template() {
        return templates.get();
    }

    private static List<String> normalize(Collection<String> selection) {
        if (selection == null) return List.of();
        var unique = new LinkedHashSet<String>();
        for (String id : selection) {
            if (id == null || id.isBlank() || id.length() > 128)
                throw RegistrationFailure.invalid("catalogSelection", "Select catalog items from the platform template.");
            unique.add(id.strip());
        }
        if (unique.size() > MAX_SELECTION)
            throw RegistrationFailure.invalid("catalogSelection", "Select at most " + MAX_SELECTION + " catalog items.");
        return List.copyOf(unique);
    }

    private Index index() {
        var template = templates.get().orElseThrow(() -> new RegistrationFailure(RegistrationFailure.Code.SERVICE_UNAVAILABLE,
                "The platform catalog is unavailable. Continue without catalog items or retry later.", "catalogSelection", 0));
        var cached = index;
        if (cached == null || cached.template != template) index = cached = new Index(template);
        return cached;
    }

    private static final class Index {
        private final PlatformCatalogTemplate template;
        private final Map<String, Map<String, List<String>>> out = new HashMap<>();
        private final Map<String, Map<String, List<String>>> in = new HashMap<>();

        Index(PlatformCatalogTemplate template) {
            this.template = template;
            for (Edge edge : template.edges()) {
                out.computeIfAbsent(edge.type(), t -> new LinkedHashMap<>()).computeIfAbsent(edge.fromId(), f -> new ArrayList<>()).add(edge.toId());
                in.computeIfAbsent(edge.type(), t -> new LinkedHashMap<>()).computeIfAbsent(edge.toId(), f -> new ArrayList<>()).add(edge.fromId());
            }
        }

        List<String> out(String type, String id) {
            return out.getOrDefault(type, Map.of()).getOrDefault(id, List.of());
        }

        List<String> in(String type, String id) {
            return in.getOrDefault(type, Map.of()).getOrDefault(id, List.of());
        }
    }
}
