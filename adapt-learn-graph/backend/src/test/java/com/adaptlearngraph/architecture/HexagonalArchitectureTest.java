package com.adaptlearngraph.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.adaptlearngraph", importOptions = ImportOption.DoNotIncludeTests.class)
class HexagonalArchitectureTest {
    @ArchTest
    static final ArchRule domainIsIndependent = noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "..api..", "..application..", "..infrastructure..", "org.springframework..",
                    "jakarta.persistence..");

    @ArchTest
    static final ArchRule applicationDependsOnPortsNotAdapters = noClasses().that()
            .resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "..api..", "..infrastructure..", "org.springframework..", "jakarta.persistence..");

    @ArchTest
    static final ArchRule controllersDoNotUseInfrastructure = noClasses().that().resideInAPackage("..api..")
            .should().dependOnClassesThat().resideInAnyPackage("..infrastructure..");
}