package com.adaptlearngraph.support;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.GZIPInputStream;

/** Immutable releases from 02590243, before knowledge fields and level ordering evolved. */
public final class HistoricalCatalogFixtures {
    private HistoricalCatalogFixtures() {}

    private static byte[] release(String name) throws IOException {
        try (var source = HistoricalCatalogFixtures.class.getResourceAsStream("/catalog/" + name + ".gz")) {
            if (source == null) throw new IOException("Missing historical release: " + name);
            try (var gzip = new GZIPInputStream(source)) { return gzip.readAllBytes(); }
        }
    }

    public static byte[] manyToMany() throws IOException { return release("ontology_seed-v09.json"); }
    public static byte[] singleSkill() throws IOException { return release("ontology_seed-v012.json"); }
    public static byte[] reviewCatalog() throws IOException { return release("ontology_seed-v011.json"); }

    public static Path releaseDirectory() throws IOException {
        Path directory = Files.createTempDirectory("single-skill-release-");
        for (String name : new String[]{"ontology_seed-v011.json", "ontology_seed-v012.json", "single-skill-v012-audit.json"}) {
            Files.write(directory.resolve(name), release(name));
        }
        Path content = Path.of("../documents/dataset/import/content");
        try (var paths = Files.walk(content)) {
            for (Path source : paths.toList()) {
                Path target = directory.resolve("content").resolve(content.relativize(source));
                if (Files.isDirectory(source)) Files.createDirectories(target);
                else Files.copy(source, target);
            }
        }
        return directory;
    }
}
