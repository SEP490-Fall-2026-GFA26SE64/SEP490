package com.adaptlearngraph.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Immutable platform ontology template (the pinned seed file) that organizations may copy from. */
public final class PlatformCatalogTemplate {
    public static final Map<String, String> GROUP_LABELS = Map.of(
            "Occupations", "Occupation",
            "TargetRoles", "TargetRole",
            "Levels", "Level",
            "Competencies", "Competency",
            "MicroSkills", "MicroSkill",
            "LearningModules", "LearningModule");

    public record Node(String id, String label, Map<String, Object> properties) {
        public Node {
            properties = Collections.unmodifiableMap(new LinkedHashMap<>(properties));
        }

        public String displayName() {
            Object name = properties.get("name");
            if (name == null) name = properties.get("title");
            return name == null ? id : name.toString();
        }

        public String code() {
            Object code = properties.get("code");
            return code == null ? null : code.toString();
        }
    }

    public record Edge(String id, String type, String fromId, String toId, Map<String, Object> properties) {
        public Edge {
            properties = Collections.unmodifiableMap(new LinkedHashMap<>(properties));
        }
    }

    private final String sha256;
    private final String version;
    private final Map<String, Node> nodes;
    private final List<Edge> edges;

    public PlatformCatalogTemplate(byte[] source, ObjectMapper json) {
        try {
            sha256 = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(source));
            Map<String, Object> root = json.readValue(source, new TypeReference<>() {});
            var indexed = new LinkedHashMap<String, Node>();
            String detected = null;
            for (var group : GROUP_LABELS.entrySet()) {
                for (Map<String, Object> row : rows(root.get(group.getKey()))) {
                    String id = text(row.get("id"));
                    if (id == null || indexed.containsKey(id)) throw new IllegalArgumentException("Template node ids must be unique");
                    var properties = new LinkedHashMap<>(row);
                    properties.remove("id");
                    if (detected == null) detected = text(row.get("version"));
                    indexed.put(id, new Node(id, group.getValue(), properties));
                }
            }
            var relationships = new ArrayList<Edge>();
            for (Map<String, Object> row : rows(root.get("relationships"))) {
                String from = text(row.get("fromId"));
                String to = text(row.get("toId"));
                String type = text(row.get("type"));
                if (type == null || !type.matches("[A-Z_]+") || !indexed.containsKey(from) || !indexed.containsKey(to))
                    throw new IllegalArgumentException("Template relationship endpoints must exist");
                var properties = new LinkedHashMap<>(row);
                properties.keySet().removeAll(List.of("id", "type", "fromId", "toId"));
                relationships.add(new Edge(text(row.get("id")), type, from, to, properties));
            }
            nodes = Collections.unmodifiableMap(indexed);
            edges = List.copyOf(relationships);
            version = detected == null ? "unknown" : detected;
        } catch (IOException | NoSuchAlgorithmException invalid) {
            throw new IllegalArgumentException("Platform catalog template is unreadable", invalid);
        }
    }

    public static PlatformCatalogTemplate load(Path path, ObjectMapper json) throws IOException {
        return new PlatformCatalogTemplate(Files.readAllBytes(path), json);
    }

    public String sha256() { return sha256; }
    public String version() { return version; }
    public Map<String, Node> nodes() { return nodes; }
    public List<Edge> edges() { return edges; }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> rows(Object value) {
        if (value == null) return List.of();
        if (!(value instanceof List<?> list)) throw new IllegalArgumentException("Template groups must be arrays");
        for (Object item : list) if (!(item instanceof Map<?, ?>)) throw new IllegalArgumentException("Template rows must be objects");
        return (List<Map<String, Object>>) value;
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }
}
