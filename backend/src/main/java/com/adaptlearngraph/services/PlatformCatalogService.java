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
 * JobPosition selects its subtree; TargetRole also includes its parent JobPosition; skills bring their prerequisite
 * closure and the modules teaching them; a selected module brings the skills it teaches and their prerequisites.
 */
public final class PlatformCatalogService {
    public static final Set<String> SELECTABLE = Set.of("JobPosition", "TargetRole", "MicroSkill", "LearningModule");
    public static final int MAX_SELECTION = 300;

    public record GraphNode(String id, String label, String name, String code) {}
    public record GraphEdge(String from, String to, String type) {}
    public record Graph(String version, String sha256, List<GraphNode> nodes, List<GraphEdge> edges) {}
    public record Closure(String templateVersion, String templateSha256, List<String> selected, Set<String> nodeIds,
                          List<Edge> edges, Map<String, Integer> nodesByLabel) {
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
                .map(n -> new GraphNode(n.id(), n.label(), n.displayName(), n.code())).toList();
        var edges = new LinkedHashSet<GraphEdge>();
        for (Edge edge : template.edges()) {
            switch (edge.type()) {
                case "HAS_ROLE" -> edges.add(new GraphEdge(edge.fromId(), edge.toId(), "HAS_ROLE"));
                case "HAS_SKILL_PREREQUISITE" -> edges.add(new GraphEdge(edge.fromId(), edge.toId(), "PREREQUISITE"));
                case "TEACHES" -> edges.add(new GraphEdge(edge.fromId(), edge.toId(), "TEACHES"));
                case "REQUIRES_SKILL" -> current.in("HAS_LEVEL", edge.fromId())
                        .forEach(role -> edges.add(new GraphEdge(role, edge.toId(), "REQUIRES")));
                default -> { }
            }
        }
        return new Graph(template.version(), template.sha256(), nodes, List.copyOf(edges));
    }

    /** Validates a guest selection and returns the closure that would be copied; an empty selection copies nothing. */
    public Closure closure(Collection<String> selection) {
        List<String> selected = normalize(selection);
        if (selected.isEmpty()) {
            var template = templates.get();
            return new Closure(template.map(PlatformCatalogTemplate::version).orElse(null),
                    template.map(PlatformCatalogTemplate::sha256).orElse(null), List.of(), Set.of(), List.of(), Map.of());
        }
        var current = index();
        for (String id : selected) {
            Node node = current.template.nodes().get(id);
            if (node == null || !SELECTABLE.contains(node.label()))
                throw RegistrationFailure.invalid("catalogSelection", "Select catalog items from the platform template.");
        }
        var nodes = new LinkedHashSet<String>();
        var skills = new SkillWalk(current, nodes);
        for (String id : selected) {
            switch (current.template.nodes().get(id).label()) {
                case "JobPosition" -> addJobPosition(current, id, nodes, skills);
                case "TargetRole" -> {
                    nodes.addAll(current.in("HAS_ROLE", id));
                    addRole(current, id, nodes, skills);
                }
                case "MicroSkill" -> skills.add(id, true);
                case "LearningModule" -> {
                    nodes.add(id);
                    current.out("TEACHES", id).forEach(skill -> skills.add(skill, false));
                }
                default -> throw new IllegalStateException("Unsupported selectable label");
            }
        }
        skills.providing.forEach(skill -> nodes.addAll(current.in("TEACHES", skill)));
        var edges = current.template.edges().stream()
                .filter(edge -> nodes.contains(edge.fromId()) && nodes.contains(edge.toId())).toList();
        var byLabel = new TreeMap<String, Integer>();
        nodes.forEach(id -> byLabel.merge(current.template.nodes().get(id).label(), 1, Integer::sum));
        return new Closure(current.template.version(), current.template.sha256(), selected,
                java.util.Collections.unmodifiableSet(nodes), edges, java.util.Collections.unmodifiableMap(byLabel));
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

    private static void addJobPosition(Index index, String jobPosition, Set<String> nodes, SkillWalk skills) {
        nodes.add(jobPosition);
        index.out("HAS_ROLE", jobPosition).forEach(role -> addRole(index, role, nodes, skills));
    }

    private static void addRole(Index index, String role, Set<String> nodes, SkillWalk skills) {
        nodes.add(role);
        for (String level : index.out("HAS_LEVEL", role)) {
            nodes.add(level);
            for (String competency : index.out("HAS_COMPETENCY", level)) {
                nodes.add(competency);
                index.out("HAS_SKILL", competency).forEach(skill -> skills.add(skill, true));
            }
            index.out("REQUIRES_SKILL", level).forEach(skill -> skills.add(skill, true));
        }
    }

    private Index index() {
        var template = templates.get().orElseThrow(() -> new RegistrationFailure(RegistrationFailure.Code.SERVICE_UNAVAILABLE,
                "The platform catalog is unavailable. Continue without catalog items or retry later.", "catalogSelection", 0));
        var cached = index;
        if (cached == null || cached.template != template) index = cached = new Index(template);
        return cached;
    }

    /** Collects skills plus prerequisite closure; "providing" skills also pull in the modules that teach them. */
    private static final class SkillWalk {
        private final Index index;
        private final Set<String> nodes;
        private final Set<String> providing = new LinkedHashSet<>();

        SkillWalk(Index index, Set<String> nodes) {
            this.index = index;
            this.nodes = nodes;
        }

        void add(String start, boolean providers) {
            var pending = new ArrayDeque<String>();
            pending.push(start);
            while (!pending.isEmpty()) {
                String skill = pending.pop();
                boolean fresh = providers ? providing.add(skill) : !nodes.contains(skill);
                nodes.add(skill);
                if (fresh) index.out("HAS_SKILL_PREREQUISITE", skill).forEach(pending::push);
            }
        }
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
