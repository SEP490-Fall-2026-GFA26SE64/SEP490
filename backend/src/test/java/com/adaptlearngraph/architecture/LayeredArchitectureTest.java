package com.adaptlearngraph.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.adaptlearngraph", importOptions = ImportOption.DoNotIncludeTests.class)
class LayeredArchitectureTest {
    private static final String[] CONTROLLER = {
            "com.adaptlearngraph.apis..", "com.adaptlearngraph.advice..", "com.adaptlearngraph.endpoints..",
            "com.adaptlearngraph.responseDto..", "com.adaptlearngraph.model.dtos.file.response.."};
    private static final String[] BUSINESS = {"com.adaptlearngraph.services.."};
    private static final String[] DATA = {
            "com.adaptlearngraph.repository..", "com.adaptlearngraph.dtos..", "com.adaptlearngraph.entities.."};
    private static final String[] INFRASTRUCTURE = {
            "com.adaptlearngraph.config..", "com.adaptlearngraph.constants..", "com.adaptlearngraph.exception..",
            "com.adaptlearngraph.helper..", "com.adaptlearngraph.jwt..", "com.adaptlearngraph.utility.."};

    /** Repository adapters implement data contracts declared by business use cases, so Data may reference Business. */
    @ArchTest
    static final ArchRule layers = layeredArchitecture().consideringOnlyDependenciesInLayers()
            .layer("Controller").definedBy(CONTROLLER)
            .layer("Business").definedBy(BUSINESS)
            .layer("Data").definedBy(DATA)
            .layer("Infrastructure").definedBy(INFRASTRUCTURE)
            .whereLayer("Controller").mayOnlyBeAccessedByLayers("Infrastructure")
            .whereLayer("Business").mayOnlyBeAccessedByLayers("Controller", "Data", "Infrastructure")
            .whereLayer("Data").mayOnlyBeAccessedByLayers("Controller", "Business", "Infrastructure");

    @ArchTest
    static final ArchRule entitiesDoNotDependOnOtherLayers = noClasses().that().resideInAPackage("com.adaptlearngraph.entities..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.adaptlearngraph.apis..", "com.adaptlearngraph.services..", "com.adaptlearngraph.repository..",
                    "com.adaptlearngraph.config..", "org.springframework..", "jakarta.persistence..");

    @ArchTest
    static final ArchRule dataDoesNotUseControllers = noClasses().that().resideInAnyPackage(DATA)
            .should().dependOnClassesThat().resideInAnyPackage(CONTROLLER);

    @ArchTest
    static final ArchRule servicesDoNotUseControllers = noClasses().that().resideInAPackage("com.adaptlearngraph.services..")
            .should().dependOnClassesThat().resideInAnyPackage(CONTROLLER);
}
