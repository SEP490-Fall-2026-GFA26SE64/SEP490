package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Imports the deterministic local/demo baseline question bank manifest. */
public final class DevelopmentQuestionBankImporter {
    private static final Logger log = LoggerFactory.getLogger(DevelopmentQuestionBankImporter.class);
    private static final String RESOURCE = "db/seed/baseline-question-bank-dev-v1.json";
    private static final String MANIFEST_VERSION = "baseline-question-bank-dev-v1";
    private static final Set<String> DIFFICULTIES = Set.of("EASY", "MEDIUM", "HARD");

    private final Connection connection;
    private final Driver driver;
    private final ObjectMapper objectMapper;

    public DevelopmentQuestionBankImporter(Connection connection, Driver driver) {
        this.connection = Objects.requireNonNull(connection, "connection must not be null");
        this.driver = Objects.requireNonNull(driver, "driver must not be null");
        this.objectMapper = new ObjectMapper();
    }

    public void importManifest() throws IOException, SQLException, NoSuchAlgorithmException {
        Manifest manifest = readManifest();
        validate(manifest);
        validateCatalogReferences(manifest.items());
        insertQuestionBank(manifest.questionBank());
        for (Item item : manifest.items()) {
            insertItem(manifest.questionBank().id(), item);
        }
        logCoverage(manifest.questionBank().id(), manifest.manifestVersion());
    }

    private Manifest readManifest() throws IOException {
        try (var input = new ClassPathResource(RESOURCE).getInputStream()) {
            return objectMapper.readValue(input, Manifest.class);
        }
    }

    private static void validate(Manifest manifest) {
        if (!MANIFEST_VERSION.equals(manifest.manifestVersion())) {
            throw new IllegalStateException("Unsupported question bank manifest: " + manifest.manifestVersion());
        }
        requireText(manifest.questionBank().name(), "questionBank.name");
        UUID.fromString(manifest.questionBank().id());
        UUID.fromString(manifest.questionBank().createdBy());
        OffsetDateTime.parse(manifest.questionBank().createdAt());
        if (manifest.items() == null || manifest.items().isEmpty()) {
            throw new IllegalStateException("Question bank manifest must contain items");
        }
        Set<String> itemVersionIds = new HashSet<>();
        Set<String> itemKeys = new HashSet<>();
        for (Item item : manifest.items()) {
            UUID.fromString(item.itemVersionId());
            UUID.fromString(item.itemId());
            if (item.version() < 1 || !itemVersionIds.add(item.itemVersionId())
                    || !itemKeys.add(item.itemId() + ":" + item.version())) {
                throw new IllegalStateException("Duplicate or invalid item identity: " + item.itemVersionId());
            }
            requireText(item.microSkillId(), "microSkillId");
            requireText(item.microSkillName(), "microSkillName");
            requireText(item.prompt(), "prompt");
            if (!DIFFICULTIES.contains(item.difficulty()) || item.options() == null || item.options().size() < 2) {
                throw new IllegalStateException("Invalid item shape: " + item.itemVersionId());
            }
            Set<String> optionIds = new HashSet<>();
            for (Option option : item.options()) {
                requireText(option.id(), "option.id");
                requireText(option.text(), "option.text");
                if (!optionIds.add(option.id())) {
                    throw new IllegalStateException("Duplicate option in item: " + item.itemVersionId());
                }
            }
            if (!optionIds.contains(item.correctOptionId())) {
                throw new IllegalStateException("Correct option is missing: " + item.itemVersionId());
            }
        }
    }

    private static void requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(field + " must not be blank");
        }
    }

    private void validateCatalogReferences(List<Item> items) {
        var expectedNames = new java.util.LinkedHashMap<String, String>();
        for (Item item : items) {
            String previous = expectedNames.putIfAbsent(item.microSkillId(), item.microSkillName());
            if (previous != null && !previous.equals(item.microSkillName())) {
                throw new IllegalStateException("Conflicting MicroSkill snapshots: " + item.microSkillId());
            }
        }
        try (var session = driver.session()) {
            for (var expected : expectedNames.entrySet()) {
                var result = session.run("""
                        MATCH (skill:MicroSkill {id: $id})
                        RETURN skill.name AS name, skill.status AS status
                        """, Values.parameters("id", expected.getKey()));
                if (!result.hasNext()) {
                    throw new IllegalStateException("Question references missing MicroSkill: " + expected.getKey());
                }
                var record = result.next();
                if (result.hasNext() || !expected.getValue().equals(record.get("name").asString())
                        || !"ACTIVE".equals(record.get("status").asString())) {
                    throw new IllegalStateException("Question references incompatible MicroSkill: " + expected.getKey());
                }
            }
        }
    }

    private void insertQuestionBank(QuestionBank bank) throws SQLException {
        try (var statement = connection.prepareStatement("""
                INSERT INTO platform.question_bank (question_bank_id, name, created_by, created_at)
                VALUES (?::uuid, ?, ?::uuid, ?::timestamptz)
                ON CONFLICT (question_bank_id) DO NOTHING
                """)) {
            statement.setString(1, bank.id());
            statement.setString(2, bank.name());
            statement.setString(3, bank.createdBy());
            statement.setString(4, bank.createdAt());
            statement.executeUpdate();
        }
        try (var statement = connection.prepareStatement("""
                SELECT name, created_by::text FROM platform.question_bank WHERE question_bank_id = ?::uuid
                """)) {
            statement.setString(1, bank.id());
            try (var result = statement.executeQuery()) {
                if (!result.next() || !bank.name().equals(result.getString(1))
                        || !bank.createdBy().equals(result.getString(2))) {
                    throw new IllegalStateException("Question bank identity conflicts with existing data: " + bank.id());
                }
            }
        }
    }

    private void insertItem(String questionBankId, Item item)
            throws SQLException, NoSuchAlgorithmException, IOException {
        JsonNode responseSchema = objectMapper.createObjectNode()
                .put("type", "SINGLE_CHOICE")
                .set("options", objectMapper.valueToTree(item.options()));
        ObjectNode protectedKey = objectMapper.createObjectNode().put("correctOptionId", item.correctOptionId());
        String contentHash = contentHash(questionBankId, item, responseSchema, protectedKey);
        try (var statement = connection.prepareStatement("""
                INSERT INTO platform.item_version (
                    item_version_id, item_id, version, question_bank_id, prompt,
                    response_schema, protected_key, publication_state, content_hash,
                    micro_skill_id, micro_skill_name_snapshot, difficulty)
                VALUES (?::uuid, ?::uuid, ?, ?::uuid, ?, ?, ?, 'PUBLISHED', ?, ?, ?, ?)
                ON CONFLICT (item_version_id) DO NOTHING
                """)) {
            statement.setString(1, item.itemVersionId());
            statement.setString(2, item.itemId());
            statement.setInt(3, item.version());
            statement.setString(4, questionBankId);
            statement.setString(5, item.prompt());
            statement.setObject(6, objectMapper.writeValueAsString(responseSchema), Types.OTHER);
            statement.setObject(7, objectMapper.writeValueAsString(protectedKey), Types.OTHER);
            statement.setString(8, contentHash);
            statement.setString(9, item.microSkillId());
            statement.setString(10, item.microSkillName());
            statement.setString(11, item.difficulty());
            statement.executeUpdate();
        }
        try (var statement = connection.prepareStatement("""
                SELECT content_hash FROM platform.item_version WHERE item_version_id = ?::uuid
                """)) {
            statement.setString(1, item.itemVersionId());
            try (var result = statement.executeQuery()) {
                if (!result.next() || !contentHash.equals(result.getString(1))) {
                    throw new IllegalStateException("Question item conflicts with existing data: " + item.itemVersionId());
                }
            }
        }
    }

    private String contentHash(String bankId, Item item, JsonNode responseSchema, JsonNode protectedKey)
            throws NoSuchAlgorithmException, IOException {
        ObjectNode canonical = objectMapper.createObjectNode();
        canonical.put("itemVersionId", item.itemVersionId());
        canonical.put("itemId", item.itemId());
        canonical.put("version", item.version());
        canonical.put("questionBankId", bankId);
        canonical.put("prompt", item.prompt());
        canonical.set("responseSchema", responseSchema);
        canonical.set("protectedKey", protectedKey);
        canonical.put("publicationState", "PUBLISHED");
        canonical.put("microSkillId", item.microSkillId());
        canonical.put("microSkillName", item.microSkillName());
        canonical.put("difficulty", item.difficulty());
        byte[] bytes = objectMapper.writeValueAsString(canonical).getBytes(StandardCharsets.UTF_8);
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    private void logCoverage(String bankId, String manifestVersion) throws SQLException {
        try (var statement = connection.prepareStatement("""
                SELECT micro_skill_id, micro_skill_name_snapshot, difficulty, count(*)
                FROM platform.item_version
                WHERE question_bank_id = ?::uuid AND publication_state = 'PUBLISHED'
                GROUP BY micro_skill_id, micro_skill_name_snapshot, difficulty
                ORDER BY micro_skill_id, difficulty
                """)) {
            statement.setString(1, bankId);
            try (var result = statement.executeQuery()) {
                while (result.next()) {
                    log.info("Baseline question coverage manifest={} skillId={} skillName={} difficulty={} count={}",
                            manifestVersion, result.getString(1), result.getString(2), result.getString(3),
                            result.getLong(4));
                }
            }
        }
    }

    private record Manifest(String manifestVersion, QuestionBank questionBank, List<Item> items) {}

    private record QuestionBank(String id, String name, String createdBy, String createdAt) {}

    private record Item(String itemVersionId, String itemId, int version, String microSkillId,
            String microSkillName, String difficulty, String prompt, List<Option> options,
            String correctOptionId) {}

    private record Option(String id, String text) {}
}
