package com.adaptlearngraph.architecture;

import com.adaptlearngraph.apis.PlatformCatalogController;
import com.adaptlearngraph.config.PlatformCatalogConfiguration;
import com.adaptlearngraph.repository.Neo4jWorkspaceCatalogWriter;
import com.adaptlearngraph.services.PlatformCatalogService;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

/** Reuses the repository's layer rules on the changed catalog owners, independent of unrelated baseline violations. */
class StarterCatalogArchitectureTest {
    @Test
    void catalogOwnersKeepTheExistingLayerAndHttpBoundaries() {
        var classes = new ClassFileImporter().importClasses(PlatformCatalogController.class,
                PlatformCatalogService.class, Neo4jWorkspaceCatalogWriter.class, PlatformCatalogConfiguration.class);
        LayeredArchitectureTest.layers.check(classes);
        LayeredArchitectureTest.webDoesNotDependOnEntitiesOrRepositories.check(classes);
        LayeredArchitectureTest.webSignaturesUseNoEntities.check(classes);
        LayeredArchitectureTest.servicesDoNotUseControllers.check(classes);
        LayeredArchitectureTest.dataDoesNotUseControllers.check(classes);
    }
}
