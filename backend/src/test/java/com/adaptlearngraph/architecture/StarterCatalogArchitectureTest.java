package com.adaptlearngraph.architecture;

import com.adaptlearngraph.apis.PlatformCatalogController;
import com.adaptlearngraph.apis.RegistrationController;
import com.adaptlearngraph.config.PlatformCatalogConfiguration;
import com.adaptlearngraph.repository.JpaWorkspaceCatalogImportStore;
import com.adaptlearngraph.repository.Neo4jWorkspaceCatalogWriter;
import com.adaptlearngraph.services.OrganizationStructureImporter;
import com.adaptlearngraph.services.PlatformCatalogService;
import com.adaptlearngraph.services.RegistrationApplicationService;
import com.adaptlearngraph.services.WorkspaceCatalogImportWorker;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

/** Reuses the repository's layer rules on the changed catalog/structure-import owners, independent of unrelated baseline violations. */
class StarterCatalogArchitectureTest {
    @Test
    void catalogOwnersKeepTheExistingLayerAndHttpBoundaries() {
        var classes = new ClassFileImporter().importClasses(PlatformCatalogController.class,
                PlatformCatalogService.class, Neo4jWorkspaceCatalogWriter.class, PlatformCatalogConfiguration.class,
                RegistrationController.class, RegistrationApplicationService.class, OrganizationStructureImporter.class,
                WorkspaceCatalogImportWorker.class, JpaWorkspaceCatalogImportStore.class);
        LayeredArchitectureTest.layers.check(classes);
        LayeredArchitectureTest.webDoesNotDependOnEntitiesOrRepositories.check(classes);
        LayeredArchitectureTest.webSignaturesUseNoEntities.check(classes);
        LayeredArchitectureTest.servicesDoNotUseControllers.check(classes);
        LayeredArchitectureTest.dataDoesNotUseControllers.check(classes);
    }
}
