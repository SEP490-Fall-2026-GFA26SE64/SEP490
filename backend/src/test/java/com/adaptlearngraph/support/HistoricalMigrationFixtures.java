package com.adaptlearngraph.support;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipInputStream;

/** Exact local V1-V66 from 3d92c594; the compatibility test must not depend on an external /tmp directory. */
public final class HistoricalMigrationFixtures {
    private HistoricalMigrationFixtures() {}

    public static Path sharedSkillScope() throws IOException {
        Path directory = Files.createTempDirectory("shared-skill-scope-migrations-");
        try (var source = HistoricalMigrationFixtures.class.getResourceAsStream("/catalog/workspace-local-v66.zip")) {
            if (source == null) throw new IOException("Missing local V66 history");
            try (var zip = new ZipInputStream(source)) {
                for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                    Path target = directory.resolve(entry.getName()).normalize();
                    if (!directory.equals(target.getParent()) || entry.isDirectory()) throw new IOException("Invalid history entry");
                    Files.copy(zip, target);
                }
            }
        }
        try (var migration = HistoricalMigrationFixtures.class.getResourceAsStream(
                "/db/workspace-migration/V73__shared_skill_assessment_attempt_scope.sql")) {
            if (migration == null) throw new IOException("Missing shared skill migration");
            Files.copy(migration, directory.resolve("V69__shared_skill_assessment_attempt_scope.sql"));
        }
        return directory;
    }
}
