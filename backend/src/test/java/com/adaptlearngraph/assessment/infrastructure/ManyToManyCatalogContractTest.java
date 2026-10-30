package com.adaptlearngraph.assessment.infrastructure;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

class ManyToManyCatalogContractTest {
    private static final Path ROOT = Path.of("..");

    @Test void newEnvelopePreservesEveryItemAndPinsTheNewCatalog() throws Exception {
        var directory = ROOT.resolve("documents/dataset/question-bank/15-1212.00");
        byte[] scopeBytes = Files.readAllBytes(directory.resolve("catalog-scope-v09.json"));
        var scope = parse(scopeBytes, OfficialQuestionBankCatalog.Scope.class);
        byte[] manifestBytes = Files.readAllBytes(ROOT.resolve(
                "backend/src/main/resources/db/seed/question-bank-15-1212.00-v1-ontology-v09.json"));
        var current = parse(manifestBytes, OfficialQuestionBankManifest.class);
        var previous = parse(Files.readAllBytes(ROOT.resolve(
                "backend/src/main/resources/db/seed/question-bank-15-1212.00-v1.json")), OfficialQuestionBankManifest.class);
        current.validate(scope);
        assertEquals("0.9.0", scope.catalogVersion());
        assertEquals(previous.items(), current.items());
        assertEquals(previous.questionBank(), current.questionBank());
        assertEquals(sha256(scopeBytes), current.scopeSha256());
        assertEquals(sha256(Files.readAllBytes(ROOT.resolve("documents/dataset/import/ontology_seed.json"))),
                scope.sourceSha256());
        var release = JSON.readTree(Files.readAllBytes(directory.resolve("release-manifest-v09.json")));
        assertEquals(sha256(manifestBytes), release.path("manifestSha256").asText());
        assertEquals(sha256(scopeBytes), release.path("scopeSha256").asText());
        assertTrue(scope.relationships().stream().filter(e -> e.type().equals("TEACHES"))
                .collect(java.util.stream.Collectors.groupingBy(OfficialQuestionBankCatalog.Edge::toId,
                        java.util.stream.Collectors.counting())).values().stream().anyMatch(n -> n > 1));
    }

    @Test void historicalCalibrationStillLoadsItsOriginalCatalogAndItems() {
        var bank = new OfficialCalibrationBankSource(ROOT).load();
        assertEquals(135, bank.items().size());
        assertEquals(OfficialCalibrationBankSource.PIN, bank.source());
    }
}
