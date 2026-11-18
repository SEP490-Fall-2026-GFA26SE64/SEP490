package com.adaptlearngraph.config;

import com.adaptlearngraph.helper.OfficialQuestionBankCatalog;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.zip.GZIPInputStream;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RiasecCatalogReleaseTest {
    static final ObjectMapper JSON = new ObjectMapper();
    static final List<String> INTERESTS = List.of("Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Conventional");

    static byte[] current() throws Exception {
        return Files.readAllBytes(Path.of("../documents/dataset/import/ontology_seed-skill-level.json"));
    }

    static byte[] predecessor() throws Exception {
        try (var input = RiasecCatalogReleaseTest.class.getResourceAsStream("/catalog/skill-level-before-riasec.json.gz")) {
            assertNotNull(input);
            try (var gzip = new GZIPInputStream(input)) { return gzip.readAllBytes(); }
        }
    }

    @Test void forwardReleaseChangesExactlyThirtyInterestValuesAndRetainsAllOtherCatalogData() throws Exception {
        var previousBytes = predecessor();
        assertEquals(LocalCatalogBootstrap.SKILL_LEVEL_HASH,
                HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(previousBytes)));
        var previous = JSON.readTree(previousBytes);
        var release = JSON.readTree(current());
        assertEquals(5, release.path("JobPositions").size());
        int changed = 0;
        for (int i = 0; i < 5; i++) {
            var oldPosition = (ObjectNode) previous.path("JobPositions").get(i);
            var newPosition = (ObjectNode) release.path("JobPositions").get(i);
            assertEquals(oldPosition.path("id"), newPosition.path("id"));
            for (String dimension : INTERESTS) {
                String key = "interest" + dimension;
                var value = newPosition.path(key);
                assertTrue(value.isIntegralNumber() && value.intValue() >= 0 && value.intValue() <= 40, key);
                assertNotEquals(oldPosition.path(key), value);
                changed++;
                oldPosition.remove(key);
                newPosition.remove(key);
            }
        }
        assertEquals(30, changed);
        assertEquals(previous, release, "Release must retain exact IDs, versions, roles, requirements, modules and edges");
    }

    @Test void checkoutLineEndingsRetainExactReleasePinsAndHistoricalQuestionIdentities() throws Exception {
        String lf = new String(current(), StandardCharsets.UTF_8).replace("\r\n", "\n");
        var historical = JSON.readValue(Files.readAllBytes(Path.of(
                "../documents/dataset/question-bank/15-1212.00/catalog-scope-v09.json")), OfficialQuestionBankCatalog.Scope.class);
        for (String text : List.of(lf, lf.replace("\n", "\r\n"))) {
            var release = LocalCatalogBootstrap.withSoftwareDevelopment(text.getBytes(StandardCharsets.UTF_8));
            assertTrue(List.of(LocalCatalogBootstrap.SKILL_LEVEL_RIASEC_HASH,
                    LocalCatalogBootstrap.SKILL_LEVEL_RIASEC_CRLF_HASH).contains(release.sourceHash()));
            assertEquals("0.12.0", release.version());
            assertTrue(release.knowledgeFieldRelease());
            assertTrue(release.hasSoftwareDevelopment());
            release.requireRetainedQuestionIdentities(historical);
        }
    }

    @Test void historicalReleaseRemainsAccepted() throws Exception {
        var release = LocalCatalogBootstrap.withSoftwareDevelopment(predecessor());
        assertEquals(LocalCatalogBootstrap.SKILL_LEVEL_HASH, release.sourceHash());
        assertTrue(release.knowledgeFieldRelease());
    }

    @Test void unreviewedProfileRoleLevelAndRelationshipChangesStillFailBeforeGraphAccess() throws Exception {
        for (String section : List.of("JobPositions", "TargetRoles", "Levels", "relationships")) {
            var changed = JSON.readTree(current());
            var row = (ObjectNode) changed.path(section).get(0);
            switch (section) {
                case "JobPositions" -> row.put("interestRealistic", 21);
                case "TargetRoles" -> row.put("name", "Unreviewed role change");
                case "Levels" -> row.put("rank", 99);
                default -> row.put("fromId", "unreviewed-endpoint");
            }
            var failure = assertThrows(IllegalStateException.class,
                    () -> new LocalCatalogBootstrap(JSON.writeValueAsBytes(changed)));
            assertEquals("Latest catalog source drift", failure.getMessage());
        }
    }
}
