package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/** Import envelope only. Source/review/rationale metadata does not extend public item DTOs. */
record OfficialQuestionBankManifest(String formatVersion, String manifestVersion, String catalogVersion,
        String sourceSha256, String scopeSha256, String occupationId, Bank questionBank, List<Item> items) {
    static final ObjectMapper JSON = JsonMapper.builder()
            .addModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
            .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS, DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT).disable(MapperFeature.ALLOW_COERCION_OF_SCALARS).build();
    record Bank(UUID id, String name) {}
    record Item(UUID itemVersionId, UUID itemId, int version, String microSkillId, String microSkillName,
            String difficulty, String prompt, JsonNode responseSchema, JsonNode protectedKey,
            String publicationState, String contentHash) {}

    static <T> T parse(byte[] bytes, Class<T> type) throws IOException {
        return JSON.readValue(bytes, type);
    }

    void validate(OfficialQuestionBankCatalog.Scope scope) { validate(scope,15); }
    void validate(OfficialQuestionBankCatalog.Scope scope,int expectedSkills) {
        require("official-question-bank-v1".equals(formatVersion), "Unsupported manifest format");
        text(manifestVersion); text(questionBank.name());
        require(questionBank.id() != null && items != null && items.size() == expectedSkills*9, "Incomplete question-bank item scope");
        require(sourceSha256.equals(scope.sourceSha256()) && occupationId.equals(scope.occupationId())
                && catalogVersion.equals(scope.catalogVersion()), "Manifest/snapshot mismatch");
        Map<String, String> skills = scope.skills();
        require(skills.size() == expectedSkills, "Incomplete Occupation skill scope");
        Set<UUID> versionIds = new HashSet<>();
        Set<String> identities = new HashSet<>();
        Set<String> prompts = new HashSet<>();
        Map<String, Integer> coverage = new TreeMap<>();
        for (Item item : items) {
            require(item.itemVersionId() != null && item.itemId() != null && item.version() > 0
                    && versionIds.add(item.itemVersionId()) && identities.add(item.itemId() + ":" + item.version()),
                    "Duplicate/invalid item identity");
            text(item.prompt());
            require(prompts.add(item.prompt().strip().toLowerCase(java.util.Locale.ROOT)), "Duplicate prompt");
            require(item.microSkillName().equals(skills.get(item.microSkillId())), "Unexpected skill snapshot");
            require(Set.of("EASY", "MEDIUM", "HARD").contains(item.difficulty()), "Invalid difficulty");
            require("DRAFT".equals(item.publicationState()), "Import cannot publish content");
            JsonNode response = item.responseSchema();
            require(response != null && response.isObject() && response.size() == 2
                    && "SINGLE_CHOICE".equals(response.path("type").asText())
                    && response.path("options").isArray() && response.path("options").size() == 4,
                    "Invalid response schema");
            Set<String> options = new HashSet<>();
            Set<String> texts = new HashSet<>();
            for (JsonNode option : response.path("options")) {
                require(option.isObject() && option.size() == 2 && option.path("id").isTextual()
                        && option.path("text").isTextual(), "Invalid option");
                text(option.path("text").asText());
                require(options.add(option.path("id").asText())
                        && texts.add(option.path("text").asText().strip().toLowerCase(java.util.Locale.ROOT)),
                        "Duplicate option");
            }
            require(options.equals(Set.of("A", "B", "C", "D")), "Expected A/B/C/D options");
            require(item.protectedKey() != null && item.protectedKey().isObject() && item.protectedKey().size() == 1
                    && options.contains(item.protectedKey().path("correctOptionId").asText()), "Invalid protected key");
            require(hash(content(questionBank.id(), item)).equals(item.contentHash()), "Item content hash mismatch");
            coverage.merge(item.microSkillId() + ":" + item.difficulty(), 1, Integer::sum);
        }
        for (String skill : skills.keySet()) {
            for (String difficulty : List.of("EASY", "MEDIUM", "HARD")) {
                require(coverage.getOrDefault(skill + ":" + difficulty, 0) == 3, "Incomplete release coverage");
            }
        }
    }

    static ObjectNode content(UUID bank, Item item) {
        ObjectNode node = JSON.valueToTree(item);
        node.remove("contentHash");
        node.put("questionBankId", bank.toString());
        return node;
    }

    static String hash(JsonNode node) { return sha256(canonical(node).getBytes(StandardCharsets.UTF_8)); }

    static String canonical(JsonNode node) {
        return sorted(node).toString();
    }

    private static JsonNode sorted(JsonNode node) {
        if (node.isObject()) {
            ObjectNode sorted = JSON.createObjectNode();
            var keys = new java.util.TreeSet<String>();
            node.fieldNames().forEachRemaining(keys::add);
            for (String key : keys) sorted.set(key, sorted(node.get(key)));
            return sorted;
        }
        if (node.isArray()) {
            var array = JSON.createArrayNode();
            for (JsonNode child : node) array.add(sorted(child));
            return array;
        }
        return node;
    }

    static String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }

    static void text(String value) { require(value != null && !value.isBlank(), "Required text missing"); }
    static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
