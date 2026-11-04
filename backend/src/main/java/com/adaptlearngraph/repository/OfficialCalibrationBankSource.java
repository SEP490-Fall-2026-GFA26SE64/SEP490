package com.adaptlearngraph.repository;

import com.adaptlearngraph.dtos.OfficialQuestionBankManifest;
import com.adaptlearngraph.helper.OfficialQuestionBankCatalog;
import com.adaptlearngraph.entities.domain.Calibration;
import com.adaptlearngraph.entities.domain.Calibration.*;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Reuses the official import validator without importing, publishing, connecting to Neo4j or creating a model. */
public final class OfficialCalibrationBankSource {
    public static final Source PIN=new Source(UUID.fromString("2f79de6b-dc62-51a1-982d-0be9d6f588dc"),
            "information-security-analysts-en-v1",
            "73e2d1a1a97ae52ff240988a33e18bfe1108f45c830df6fa3469f93c39166836",
            "3e8ea204ebd2ea08d622e4a5c35c38185f1dbaa922fc5c6cce9566ed3382ee60",
            "65e5351b47352ea1bcf4298e0c0dcf93e9fba757c8298e8e509700721cabb010");
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
                    && parsed.scopeSha256().equals(PIN.scopeHash()) && parsed.jobPositionId().equals("OCC-15-1212.00"));
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
