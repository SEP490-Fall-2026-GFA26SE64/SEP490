package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.repository.PlatformCatalogTemplate;
import com.adaptlearngraph.repository.PlatformCatalogTemplate.Edge;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class PlatformCatalogServiceTest {
    static PlatformCatalogTemplate template() throws Exception {
        try (var input = PlatformCatalogServiceTest.class.getResourceAsStream("/platform-catalog/template-fixture.json")) {
            return new PlatformCatalogTemplate(input.readAllBytes(), new ObjectMapper());
        }
    }

    private final PlatformCatalogService service;

    PlatformCatalogServiceTest() throws Exception {
        var template = template();
        service = new PlatformCatalogService(() -> Optional.of(template));
    }

    private static Set<String> edges(PlatformCatalogService.Closure closure) {
        return closure.edges().stream().map(Edge::id).collect(Collectors.toSet());
    }

    @Test void roleBringsParentJobPositionSubtreePrerequisitesAndTeachingModules() {
        var closure = service.closure(List.of("ROLE-A"));
        assertThat(closure.nodeIds()).containsExactlyInAnyOrder(
                "OCC-1", "ROLE-A", "LV-A1", "CMP-A1", "MS-A", "MS-B", "MS-P", "MOD-A", "MOD-P", "MOD-X");
        assertThat(edges(closure)).containsExactlyInAnyOrder(
                "REL-1", "REL-3", "REL-5", "REL-6", "REL-7", "REL-8", "REL-10", "REL-11", "REL-12", "REL-14");
        assertThat(closure.nodesByLabel()).containsEntry("MicroSkill", 3).containsEntry("LearningModule", 3).containsEntry("JobPosition", 1);
        assertThat(closure.templateVersion()).isEqualTo("fixture-1");
        assertThat(closure.templateSha256()).matches("[0-9a-f]{64}");
    }

    @Test void jobPositionCopiesItsWholeSubtreeOnly() {
        var closure = service.closure(List.of("OCC-2"));
        assertThat(closure.nodeIds()).containsExactlyInAnyOrder("OCC-2", "ROLE-B", "LV-B1", "MS-X", "MOD-X");
        assertThat(edges(closure)).containsExactlyInAnyOrder("REL-2", "REL-4", "REL-9", "REL-13");
    }

    @Test void skillBringsPrerequisitesAndProvidersWhileModuleBringsOnlyItsSkills() {
        var skill = service.closure(List.of("MS-A"));
        assertThat(skill.nodeIds()).containsExactlyInAnyOrder("MS-A", "MS-P", "MOD-A", "MOD-P");
        assertThat(edges(skill)).containsExactlyInAnyOrder("REL-10", "REL-11", "REL-12");

        var module = service.closure(List.of("MOD-X"));
        assertThat(module.nodeIds()).containsExactlyInAnyOrder("MOD-X", "MS-X", "MS-B");
        assertThat(edges(module)).containsExactlyInAnyOrder("REL-13", "REL-14");
    }

    @Test void onlyEdgesWithBothEndpointsCopiedAreReturned() {
        var closure = service.closure(List.of("MOD-X", "ROLE-A", "ROLE-A"));
        assertThat(closure.selected()).containsExactly("MOD-X", "ROLE-A");
        for (Edge edge : closure.edges()) assertThat(closure.nodeIds()).contains(edge.fromId(), edge.toId());
        assertThat(edges(closure)).contains("REL-13", "REL-14");
    }

    @Test void emptySelectionCopiesNothingAndInvalidSelectionsAreRejected() {
        var empty = service.closure(List.of());
        assertThat(empty.nodeIds()).isEmpty();
        assertThat(empty.relationshipCount()).isZero();
        assertThat(service.closure(null).nodeCount()).isZero();
        for (var invalid : List.of(List.of("LV-A1"), List.of("UNKNOWN"), List.of(" "),
                IntStream.range(0, PlatformCatalogService.MAX_SELECTION + 1).mapToObj(i -> "N" + i).toList())) {
            assertThatThrownBy(() -> service.closure(invalid)).isInstanceOfSatisfying(RegistrationFailure.class,
                    failure -> assertThat(failure.field()).isEqualTo("catalogSelection"));
        }
    }

    @Test void unavailableTemplateAllowsOnlyAnEmptySelection() {
        var unavailable = new PlatformCatalogService(Optional::empty);
        assertThat(unavailable.closure(Collections.emptyList()).nodeCount()).isZero();
        assertThatThrownBy(() -> unavailable.closure(List.of("ROLE-A"))).isInstanceOfSatisfying(RegistrationFailure.class,
                failure -> assertThat(failure.code()).isEqualTo(RegistrationFailure.Code.SERVICE_UNAVAILABLE));
        assertThatThrownBy(unavailable::graph).isInstanceOf(RegistrationFailure.class);
    }

    @Test void graphExposesSelectableNodesAndDerivedRoleRequirements() {
        var graph = service.graph();
        assertThat(graph.nodes()).extracting(PlatformCatalogService.GraphNode::id)
                .containsExactlyInAnyOrder("OCC-1", "OCC-2", "ROLE-A", "ROLE-B", "MS-A", "MS-B", "MS-P", "MS-X", "MOD-A", "MOD-P", "MOD-X");
        assertThat(graph.edges()).contains(
                new PlatformCatalogService.GraphEdge("ROLE-A", "MS-A", "REQUIRES"),
                new PlatformCatalogService.GraphEdge("ROLE-A", "MS-B", "REQUIRES"),
                new PlatformCatalogService.GraphEdge("ROLE-B", "MS-X", "REQUIRES"),
                new PlatformCatalogService.GraphEdge("OCC-1", "ROLE-A", "HAS_ROLE"),
                new PlatformCatalogService.GraphEdge("MS-A", "MS-P", "PREREQUISITE"),
                new PlatformCatalogService.GraphEdge("MOD-X", "MS-B", "TEACHES"));
        assertThat(graph.nodes()).filteredOn(n -> n.id().equals("MOD-A")).extracting(PlatformCatalogService.GraphNode::name).containsExactly("Module A");
    }
}
