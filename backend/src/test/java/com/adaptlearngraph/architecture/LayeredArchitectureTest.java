package com.adaptlearngraph.architecture;

import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAnyPackage;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.adaptlearngraph", importOptions = ImportOption.DoNotIncludeTests.class)
class LayeredArchitectureTest {
    private static final DescribedPredicate<JavaClass> JPA_MAPPED = new DescribedPredicate<>("JPA mapped") {
        @Override
        public boolean test(JavaClass type) {
            JavaClass owner = type;
            while (owner.getEnclosingClass().isPresent()) owner = owner.getEnclosingClass().get();
            return owner.isAnnotatedWith("jakarta.persistence.Entity") || owner.isAnnotatedWith("jakarta.persistence.Embeddable")
                    || owner.isAnnotatedWith("jakarta.persistence.MappedSuperclass");
        }
    };
    /** Spring Data Neo4j catalog read models ({@code @Node}) and their property converters. */
    private static final DescribedPredicate<JavaClass> GRAPH_MAPPED = new DescribedPredicate<>("Neo4j mapped") {
        @Override
        public boolean test(JavaClass type) {
            JavaClass owner = type;
            while (owner.getEnclosingClass().isPresent()) owner = owner.getEnclosingClass().get();
            return owner.isAnnotatedWith("org.springframework.data.neo4j.core.schema.Node")
                    || owner.isAssignableTo("org.springframework.data.neo4j.core.convert.Neo4jPersistentPropertyConverter");
        }
    };
    private static final String[] SDN_MAPPING = {
            "org.springframework.data.neo4j.core.schema..", "org.springframework.data.neo4j.core.convert.."};
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

    /** Entities (JPA and domain) never reach into other layers or Spring. */
    @ArchTest
    static final ArchRule entitiesDoNotDependOnOtherLayers = noClasses().that().resideInAPackage("com.adaptlearngraph.entities..")
            .and(DescribedPredicate.not(GRAPH_MAPPED))
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.adaptlearngraph.apis..", "com.adaptlearngraph.services..", "com.adaptlearngraph.repository..",
                    "com.adaptlearngraph.config..", "org.springframework..");

    /** {@code @Node} read models may use only the SDN mapping annotations/converter SPI, never other layers or Spring APIs. */
    @ArchTest
    static final ArchRule graphMappingsUseOnlySdnMappingMetadata = noClasses().that().resideInAPackage("com.adaptlearngraph.entities..")
            .and(GRAPH_MAPPED)
            .should().dependOnClassesThat(resideInAnyPackage(
                    "com.adaptlearngraph.apis..", "com.adaptlearngraph.services..", "com.adaptlearngraph.repository..",
                    "com.adaptlearngraph.config..")
                    .or(resideInAPackage("org.springframework..").and(DescribedPredicate.not(resideInAnyPackage(SDN_MAPPING)))));

    /** Only JPA-mapped classes may use JPA/Hibernate; immutable domain records stay persistence-free. */
    @ArchTest
    static final ArchRule domainModelIsPersistenceFree = noClasses().that().resideInAPackage("com.adaptlearngraph.entities..")
            .and(DescribedPredicate.not(JPA_MAPPED))
            .should().dependOnClassesThat().resideInAnyPackage("jakarta.persistence..", "org.hibernate..");

    /** Immutable domain models live in {@code entities.domain} and never touch persistence APIs. */
    @ArchTest
    static final ArchRule domainPackageIsPersistenceFree = noClasses().that().resideInAPackage("com.adaptlearngraph.entities.domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "jakarta.persistence..", "org.hibernate..", "org.springframework.data..");

    @ArchTest
    static final ArchRule dataDoesNotUseControllers = noClasses().that().resideInAnyPackage(DATA)
            .should().dependOnClassesThat().resideInAnyPackage(CONTROLLER);

    @ArchTest
    static final ArchRule servicesDoNotUseControllers = noClasses().that().resideInAPackage("com.adaptlearngraph.services..")
            .should().dependOnClassesThat().resideInAnyPackage(CONTROLLER);
}
