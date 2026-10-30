package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Reuses the official import validator without importing, publishing, connecting to Neo4j or creating a model. */
public final class OfficialCalibrationBankSource {
    public static final Source PIN=new Source(UUID.fromString("2f79de6b-dc62-51a1-982d-0be9d6f588dc"),
            "information-security-analysts-en-v1","52d065a031aa9adca51808c59a7682872b7436343f0c300db84cfe1beb2fe882",
            "c2454bde23764d061b6b25b54d434141715326d75eaa3201026618e7e4136231",
            "0006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125");
    private final Path root;
    public OfficialCalibrationBankSource(Path repositoryRoot) { root=repositoryRoot.toAbsolutePath().normalize(); }
    public Bank load() {
        try {
            byte[] manifest=read("documents/dataset/question-bank/15-1212.00/historical/question-bank-v1.json",PIN.manifestHash());
            byte[] scope=read("documents/dataset/question-bank/15-1212.00/historical/catalog-scope-v08.json",PIN.scopeHash());
            // Historical calibration remains bound to its original v0.8 catalog, never the current release.
            read("documents/dataset/question-bank/15-1212.00/historical/ontology_seed-v08.json",PIN.ontologyHash());
            var parsed=OfficialQuestionBankManifest.parse(manifest,OfficialQuestionBankManifest.class);
            parsed.validate(OfficialQuestionBankManifest.parse(scope,OfficialQuestionBankCatalog.Scope.class));
            Calibration.require(parsed.questionBank().id().equals(PIN.bankId()) && parsed.manifestVersion().equals(PIN.manifestVersion())
                    && parsed.scopeSha256().equals(PIN.scopeHash()) && parsed.occupationId().equals("OCC-15-1212.00"));
            List<Item> items=parsed.items().stream().map(i->new Item(new ItemPin(i.itemVersionId(),i.itemId(),i.version(),
                    i.microSkillId(),i.contentHash()),List.of("A","B","C","D"),i.protectedKey().get("correctOptionId").asText()))
                    .sorted(Comparator.comparing((Item i)->i.pin().skillId()).thenComparing(i->i.pin().itemVersionId().toString())).toList();
            return new Bank(PIN,items);
        } catch (IOException | IllegalArgumentException failure) { throw new Failure(Code.INVALID_INPUT); }
    }
    private byte[] read(String relative,String hash) throws IOException {
        Path file=root.resolve(relative).normalize(); Calibration.require(file.startsWith(root));
        // Read at most the fixed limit even if a file grows between stat and read.
        try (var stream=Files.newInputStream(file)) {
            byte[] bytes=stream.readNBytes(67_108_865);
            Calibration.require(bytes.length<=67_108_864 && OfficialQuestionBankManifest.sha256(bytes).equals(hash)); return bytes;
        }
    }
}
