package com.adaptlearngraph.architecture;

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
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.adaptlearngraph.apis..", "com.adaptlearngraph.services..", "com.adaptlearngraph.repository..",
                    "com.adaptlearngraph.config..", "org.springframework..");

    /** Only JPA-mapped classes may use JPA/Hibernate; immutable domain records stay persistence-free. */
    @ArchTest
    static final ArchRule domainModelIsPersistenceFree = noClasses().that().resideInAPackage("com.adaptlearngraph.entities..")
            .and(DescribedPredicate.not(JPA_MAPPED))
            .should().dependOnClassesThat().resideInAnyPackage("jakarta.persistence..", "org.hibernate..");

    @ArchTest
    static final ArchRule dataDoesNotUseControllers = noClasses().that().resideInAnyPackage(DATA)
            .should().dependOnClassesThat().resideInAnyPackage(CONTROLLER);

    @ArchTest
    static final ArchRule servicesDoNotUseControllers = noClasses().that().resideInAPackage("com.adaptlearngraph.services..")
            .should().dependOnClassesThat().resideInAnyPackage(CONTROLLER);
}
