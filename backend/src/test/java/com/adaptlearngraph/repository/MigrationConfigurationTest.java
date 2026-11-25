package com.adaptlearngraph.repository;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

class MigrationConfigurationTest {
    @Test void everySelectableHistoryHasUniqueVersionsAndOnlyRetiredPricingGaps() throws Exception {
        for (String directory : new String[]{"migration", "workspace-migration", "module-migration"}) {
            var resource = getClass().getResource("/db/" + directory);
            assertNotNull(resource);
            var versions = new HashSet<Integer>();
            try (var paths = Files.list(Path.of(resource.toURI()))) {
                for (var path : paths.filter(p -> p.getFileName().toString().endsWith(".sql")).toList()) {
                    var name = path.getFileName().toString();
                    int version = Integer.parseInt(name.substring(1, name.indexOf("__")));
                    assertTrue(versions.add(version), directory + " duplicate V" + version);
                }
            }
            int latest = 83;
            // V68/V69 were retired when pricing V67 was reconciled with assessment V71-V73; the other
            // gaps are versions that only exist in another history.
            var gaps = Map.of("migration", Set.of(68, 69, 78), "workspace-migration", Set.of(68, 69),
                    "module-migration", Set.of(68, 69, 74, 75, 76, 77, 78)).get(directory);
            assertEquals(latest - gaps.size(), versions.size(), directory);
            for (int version = 1; version <= latest; version++) {
                assertEquals(!gaps.contains(version), versions.contains(version), directory + " V" + version);
            }
        }
    }

    @Test void workspaceProfileDefaultsToWorkspaceHistoryAndAllowsExplicitSelection() throws IOException {
        var options = new LoaderOptions();
        options.setAllowDuplicateKeys(false);
        var yaml = new Yaml(new SafeConstructor(options));
        try (var source = getClass().getResourceAsStream("/application-workspace-baseline.yml")) {
            assertNotNull(source);
            Map<?, ?> document = yaml.load(source);
            var spring = (Map<?, ?>) document.get("spring");
            var flyway = (Map<?, ?>) spring.get("flyway");
            assertEquals("${WORKSPACE_MIGRATION_LOCATION:classpath:db/workspace-migration}", flyway.get("locations"));
        }
    }

    @Test void existingAccountsStackSelectsItsHistoryAndDisablesAutomaticSeeds() throws IOException {
        var options = new LoaderOptions();
        options.setAllowDuplicateKeys(false);
        var yaml = new Yaml(new SafeConstructor(options));
        var compose = Path.of("../compose.accounts-dev.yml");
        if (!Files.exists(compose)) compose = Path.of("compose.accounts-dev.yml");
        try (var source = Files.newInputStream(compose)) {
            Map<?, ?> document = yaml.load(source);
            var services = (Map<?, ?>) document.get("services");
            var api = (Map<?, ?>) services.get("api");
            var environment = (Map<?, ?>) api.get("environment");
            assertEquals("classpath:db/module-migration", environment.get("WORKSPACE_MIGRATION_LOCATION"));
            assertEquals("false", environment.get("CATALOG_SEED_ENABLED"));
            assertEquals("false", environment.get("WORKSPACE_DEV_SEED_ENABLED"));
        }
    }
}
