package com.adaptlearngraph.repository;

import static org.junit.jupiter.api.Assertions.assertNull;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.regex.Pattern;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MigrationVersionUniquenessTest {
    @ParameterizedTest
    @ValueSource(strings = {"migration", "workspace-migration", "module-migration"})
    void eachLineageHasUniqueFlywayVersions(String lineage) throws Exception {
        var versions = new HashMap<MigrationVersion, String>();
        var pattern = Pattern.compile("V(.+)__(.+)\\.sql");
        try (var files = Files.walk(Path.of("src/main/resources/db", lineage))) {
            for (var file : files.filter(Files::isRegularFile).sorted().toList()) {
                var name = file.getFileName().toString();
                var match = pattern.matcher(name);
                if (!match.matches()) continue;
                var version = MigrationVersion.fromVersion(match.group(1));
                var previous = versions.putIfAbsent(version, name);
                assertNull(previous, () -> lineage + ": duplicate version " + version
                        + " in " + previous + " and " + name);
            }
        }
    }
}
