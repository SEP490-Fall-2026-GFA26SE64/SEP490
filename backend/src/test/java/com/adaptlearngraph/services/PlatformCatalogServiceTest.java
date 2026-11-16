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

    @Test void explicitSelectionPreservesPruningAndNeverImportsModules() {
        var closure = service.closure(List.of("ROLE-A", "LV-A1", "MS-A"));
        assertThat(closure.nodeIds()).containsExactlyInAnyOrder("OCC-1", "ROLE-A", "LV-A1", "MS-A", "MS-P");
        assertThat(closure.nodesByLabel()).doesNotContainKey("LearningModule");
        assertThat(edges(closure)).containsExactlyInAnyOrder("REL-1", "REL-3", "REL-7", "REL-10");
    }

    @Test void levelAndCompetencyAreSelectableAndKeepTheirStructuralAncestors() {
        assertThat(service.closure(List.of("LV-A1")).nodeIds())
                .containsExactlyInAnyOrder("OCC-1", "ROLE-A", "LV-A1");
        assertThat(service.closure(List.of("CMP-A1")).nodeIds())
                .containsExactlyInAnyOrder("OCC-1", "ROLE-A", "LV-A1", "CMP-A1");
        assertThatThrownBy(() -> service.closure(List.of("MOD-A"))).isInstanceOf(RegistrationFailure.class);
    }

    @Test void expandedBranchBringsOnlySelectedStructureAndPrerequisites() {
        var closure = service.closure(List.of("OCC-1", "ROLE-A", "LV-A1", "CMP-A1", "MS-A", "MS-B"));
        assertThat(closure.nodeIds()).containsExactlyInAnyOrder(
                "OCC-1", "ROLE-A", "LV-A1", "CMP-A1", "MS-A", "MS-B", "MS-P");
        assertThat(edges(closure)).containsExactlyInAnyOrder(
                "REL-1", "REL-3", "REL-5", "REL-6", "REL-7", "REL-8", "REL-10");
        assertThat(closure.nodesByLabel()).containsEntry("MicroSkill", 3).doesNotContainKey("LearningModule");
        assertThat(closure.templateVersion()).isEqualTo("fixture-1");
        assertThat(closure.templateSha256()).matches("[0-9a-f]{64}");
    }

    @Test void selectingAParentDoesNotSilentlyRestorePrunedDescendants() {
        var closure = service.closure(List.of("OCC-2"));
        assertThat(closure.nodeIds()).containsExactly("OCC-2");
        assertThat(closure.edges()).isEmpty();
    }

    @Test void skillBringsPrerequisitesWithoutUnrelatedParentsOrProviders() {
        var skill = service.closure(List.of("MS-A"));
        assertThat(skill.nodeIds()).containsExactlyInAnyOrder("MS-A", "MS-P");
        assertThat(edges(skill)).containsExactly("REL-10");
        assertThat(skill.inclusions()).containsExactly(new PlatformCatalogService.Inclusion("MS-P", "PREREQUISITE", "MS-A"));
        assertThat(service.closure(List.of("MS-P")).inclusions()).isEmpty();
    }

    @Test void onlyEdgesWithBothEndpointsCopiedAreReturned() {
        var closure = service.closure(List.of("MS-X", "ROLE-A", "ROLE-A"));
        assertThat(closure.selected()).containsExactly("MS-X", "ROLE-A");
        for (Edge edge : closure.edges()) assertThat(closure.nodeIds()).contains(edge.fromId(), edge.toId());
        assertThat(edges(closure)).containsExactly("REL-1");
    }

    @Test void sharedPrerequisitesRemainUntilTheirLastDependentIsRemoved() throws Exception {
        var json = new ObjectMapper();
        com.fasterxml.jackson.databind.node.ObjectNode root;
        try (var input = getClass().getResourceAsStream("/platform-catalog/template-fixture.json")) {
            root = (com.fasterxml.jackson.databind.node.ObjectNode) json.readTree(input);
        }
        root.withArray("relationships").addObject().put("id", "SHARED").put("type", "HAS_SKILL_PREREQUISITE")
                .put("fromId", "MS-B").put("toId", "MS-P");
        var template = new PlatformCatalogTemplate(json.writeValueAsBytes(root), json);
        var shared = new PlatformCatalogService(() -> Optional.of(template));
        assertThat(shared.closure(List.of("MS-A", "MS-B")).inclusions()).containsExactlyInAnyOrder(
                new PlatformCatalogService.Inclusion("MS-P", "PREREQUISITE", "MS-A"),
                new PlatformCatalogService.Inclusion("MS-P", "PREREQUISITE", "MS-B"));
        assertThat(shared.closure(List.of("MS-B")).nodeIds()).containsExactlyInAnyOrder("MS-B", "MS-P");
        assertThat(shared.closure(List.of("OCC-1")).nodeIds()).containsExactly("OCC-1");
    }

    @Test void emptySelectionCopiesNothingAndInvalidSelectionsAreRejected() {
        var empty = service.closure(List.of());
        assertThat(empty.nodeIds()).isEmpty();
        assertThat(empty.relationshipCount()).isZero();
        assertThat(service.closure(null).nodeCount()).isZero();
        for (var invalid : List.of(List.of("MOD-A"), List.of("UNKNOWN"), List.of(" "),
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

    @Test void graphExposesFiveTypesAndActualRelationshipMetadata() {
        var graph = service.graph();
        assertThat(graph.nodes()).extracting(PlatformCatalogService.GraphNode::id)
                .containsExactlyInAnyOrder("OCC-1", "OCC-2", "ROLE-A", "ROLE-B", "LV-A1", "LV-B1", "CMP-A1",
                        "MS-A", "MS-B", "MS-P", "MS-X");
        assertThat(graph.edges()).extracting(PlatformCatalogService.GraphEdge::id)
                .containsExactlyInAnyOrder("REL-1", "REL-2", "REL-3", "REL-4", "REL-5", "REL-6", "REL-7", "REL-8", "REL-9", "REL-10");
        assertThat(graph.edges()).filteredOn(e -> e.id().equals("REL-7")).singleElement().satisfies(edge ->
                assertThat(edge.properties()).containsEntry("isMandatory", true).containsKey("requiredScore"));
    }
}
