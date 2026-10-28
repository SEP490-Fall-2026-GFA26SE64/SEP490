package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.port.out.ModuleAuthoringPort;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ModuleAuthoringServiceTest {
    ModuleAuthoringPort port;
    ModuleAuthoringService service;
    Actor actor;
    Map<String, Document> documents;
    Map<String, Integer> pins;
    Content content;
    @BeforeEach void setup() {
        port = mock(ModuleAuthoringPort.class); service = new ModuleAuthoringService(port);
        actor = new Actor("expert-a", "org", Set.of("EXPERT")); documents = new HashMap<>(); pins = new HashMap<>();
        content = new Content("content", "Lesson", "# Learn\nPractice the task.", "text/markdown", "1.0", List.of("occ"), "expert-a", ModuleAuthoring.now());
        when(port.actor()).thenAnswer(call -> actor);
        when(port.transaction(any())).thenAnswer(call -> call.<Supplier<?>>getArgument(0).get());
        when(port.occupations(any())).thenReturn(List.of("occ"));
        when(port.catalog("Occupation")).thenReturn(List.of(new Choice("occ", "Occupation")));
        when(port.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill", "Skill"), new Choice("support", "Supporting skill")));
        when(port.contents("org")).thenReturn(List.of(content));
        when(port.lock(anyString(), anyString())).thenAnswer(call -> Optional.ofNullable(documents.get(call.getArgument(1))));
        when(port.documents("org")).thenAnswer(call -> List.copyOf(documents.values()));
        doAnswer(call -> { Document d = call.getArgument(0); documents.put(d.id(), d); return null; }).when(port).save(any());
        doAnswer(call -> { Document d = call.getArgument(0); documents.remove(d.id()); return null; }).when(port).delete(any());
        when(port.retainsCoverage(any())).thenReturn(true);
        when(port.pinned(anyString(), anyString(), anyString())).thenAnswer(call -> Optional.ofNullable(pins.get(call.getArgument(1) + ":" + call.getArgument(2))));
        doAnswer(call -> { pins.put(call.getArgument(1) + ":" + call.getArgument(2), call.getArgument(3)); return null; }).when(port).pin(anyString(), anyString(), anyString(), anyInt());
    }
    Save input(String title) { return new Save(title, "LESSON_AND_PRACTICE", "content", 90, new BigDecimal("200000"), List.of("occ"),
            List.of(new TeachingInput("skill", "PRIMARY", "LOW"), new TeachingInput("support", "SUPPORTING", "MEDIUM"))); }
    CatalogModule graph(String id, String title) {
        return new CatalogModule(new Metadata(id, "0.11.0", "ACTIVE", "NEEDS_EXPERT_REVIEW", null, null), title,
                "RESOURCE_GUIDED_PRACTICE", "https://example.org/lesson", "text/markdown", "1.3", 37,
                new BigDecimal("123456"), List.of(new CatalogTeaching(new Metadata("edge-" + id, "0.11.0", "ACTIVE", "NEEDS_EXPERT_REVIEW", null, null), "skill", "Skill", "PRIMARY", "MEDIUM")));
    }
    Map<String, Intake> intakeFixtures() {
        Map<String, Intake> intakes = new HashMap<>();
        when(port.intakes(anyString())).thenAnswer(c -> intakes.values().stream().filter(i -> i.organizationId().equals(c.getArgument(0))).toList());
        when(port.intakeExists(anyString())).thenAnswer(c -> intakes.containsKey(c.getArgument(0)));
        doAnswer(c -> { Intake i = c.getArgument(0); intakes.put(i.moduleId(), i); return null; }).when(port).saveIntake(any());
        when(port.managedModuleIds()).thenAnswer(c -> List.copyOf(documents.keySet()));
        when(port.graphModules("org")).thenReturn(List.of(graph("legacy", "Imported lesson")));
        when(port.importedMarkdown(anyString())).thenReturn("# Imported lesson\nReal source Markdown.");
        return intakes;
    }
    @Test void intakePreservesIdentitySourceAndUnknownCreatorUntilReviewedRelease() {
        intakeFixtures(); manager();
        Intake assigned = service.assignIntake("legacy", List.of("occ"));
        assertEquals("ld-reviewer", assigned.assignedBy()); assertNull(assigned.acceptedBy());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("legacy"));
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        Document doc = service.acceptIntake("legacy");
        assertEquals("legacy", doc.id()); assertNull(doc.createdBy()); assertEquals("expert-a", doc.intake().acceptedBy());
        assertEquals(assigned.source(), doc.intake().source()); assertEquals("INTAKE", doc.history().getLast().action());
        assertEquals("edge-legacy", doc.current().payload().teachings().getFirst().metadata().id());
        assertEquals(assigned.source().contentUri(), doc.current().payload().contentUri());
        assertEquals("1.3", doc.current().payload().contentVersion()); assertEquals("DRAFT", doc.current().state());
        assertNull(doc.current().payload().content().createdBy()); assertTrue(doc.current().payload().content().markdown().contains("Real source"));
        verify(port, never()).project(any(), any(), anyBoolean());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("legacy"));
        final Document accepted = doc;
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.delete(accepted.id(), accepted.lockVersion()));
        doc = release(doc); assertEquals("RELEASED", doc.current().state()); assertNull(doc.createdBy());
        assertEquals(assigned.source(), doc.intake().source()); verify(port).project(any(), any(), eq(false));
    }
    @Test void intakeRejectsUnassignedForeignDuplicateAndDriftWithoutWrites() {
        var intakes = intakeFixtures();
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("legacy", List.of("occ")));
        manager(); service.assignIntake("legacy", List.of("occ"));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("legacy", List.of("occ")));
        actor = new Actor("foreign", "foreign-org", Set.of("LD_MANAGER"));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("legacy", List.of("occ")));
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        when(port.occupations(any())).thenReturn(List.of());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("legacy"));
        when(port.occupations(any())).thenReturn(List.of("occ"));
        when(port.graphModules("org")).thenReturn(List.of(graph("legacy", "Changed externally")));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("legacy"));
        assertNull(intakes.get("legacy").acceptedBy()); verify(port, never()).save(any()); verify(port, never()).saveContent(anyString(), any());
    }
    @Test void managerCanRefreshUnacceptedAssignmentWithTokenAndAudit() {
        intakeFixtures(); manager(); Intake first = service.assignIntake("legacy", List.of("occ"));
        when(port.graphModules("org")).thenReturn(List.of(graph("legacy", "Refreshed source")));
        Intake refreshed = service.assignIntake("legacy", List.of("occ"), first.assignedAt());
        assertEquals("Refreshed source", refreshed.source().title()); assertEquals(2, refreshed.history().size());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("legacy", List.of("occ"), first.assignedAt()));
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        Document doc = service.acceptIntake("legacy"); assertEquals(3, doc.history().size());
        manager(); assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("legacy", List.of("occ"), refreshed.assignedAt()));
    }
    @Test void intakeDoesNotInventContentWhenSourceIsMissing() {
        intakeFixtures(); manager(); service.assignIntake("legacy", List.of("occ"));
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        when(port.importedMarkdown(anyString())).thenThrow(new ModuleAuthoringService.Failure(409, "Source missing"));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("legacy"));
        verify(port, never()).saveContent(anyString(), any()); verify(port, never()).save(any());
    }
    @Test void listsSharedNeo4jCatalogWithoutFabricatingHistoryAndCombinesScopedDraftsOnce() {
        Document own = service.create(input("Draft"));
        when(port.graphModules("org")).thenReturn(List.of(graph("legacy", "Existing catalog"), graph(own.id(), "Published title"), graph("private", "Other scope"), graph("foreign", "Other organization")));
        when(port.managedModuleIds()).thenReturn(List.of(own.id(), "private", "foreign"));
        CatalogPage result = service.catalogList("", "", "", "", "", 1);
        assertEquals(2, result.total());
        CatalogItem legacy = result.items().stream().filter(i -> i.module().metadata().id().equals("legacy")).findFirst().orElseThrow();
        assertNull(legacy.authoring()); assertNull(legacy.module().metadata().reviewedBy());
        assertEquals(37, legacy.module().duration()); assertEquals(new BigDecimal("123456"), legacy.module().price());
        assertEquals(own.id(), result.items().stream().filter(i -> i.authoring() != null).findFirst().orElseThrow().authoring().id());
        assertEquals(1, service.catalogList("published", "ACTIVE", "NEEDS_EXPERT_REVIEW", "RESOURCE_GUIDED_PRACTICE", "skill", 1).total());
        assertEquals(0, service.catalogList("", "", "APPROVED", "", "", 1).total());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.detail("legacy"));
        verify(port, never()).save(argThat(d -> d.id().equals("legacy")));
    }
    @Test void paginatesGraphCatalogDeterministicallyAndDoesNotUseScopeAsWritePermission() {
        when(port.occupations(any())).thenReturn(List.of());
        when(port.graphModules("org")).thenReturn(java.util.stream.IntStream.range(0, 23).mapToObj(i -> graph("catalog-" + i, String.format("Lesson %02d", i))).toList());
        CatalogPage result = service.catalogList("", "", "", "", "", 2);
        assertEquals(23, result.total()); assertEquals(10, result.items().size()); assertEquals("Lesson 10", result.items().getFirst().module().title());
        assertEquals(3, service.catalogList("", "", "", "", "", 999).page());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.create(input("Unauthorized")));
        actor = new Actor("learner", "org", Set.of("EMPLOYEE"));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.catalogList("", "", "", "", "", 1));
    }
    void manager() { actor = new Actor("ld-reviewer", "org", Set.of("LD_MANAGER")); }
    Document release(Document doc) {
        doc = service.action(doc.id(), doc.lockVersion(), "submit", null); manager();
        return service.action(doc.id(), doc.lockVersion(), "approve", null);
    }
    @Test void persistsAllFieldsAndTracksCreatorAndDifferentEditorWithoutChangingPriorPayload() {
        Document first = service.create(input("First"));
        actor = new Actor("expert-b", "org", Set.of("EXPERT"));
        Document second = service.update(first.id(), first.lockVersion(), input("Second"));
        assertEquals("expert-a", second.createdBy()); assertEquals("expert-b", second.current().editedBy());
        assertEquals("First", second.revisions().getFirst().payload().title());
        assertEquals("Second", second.current().payload().title()); assertEquals(2, second.revisions().size());
        var p = second.current().payload(); assertEquals(90, p.duration()); assertEquals(new BigDecimal("200000"), p.price());
        assertEquals("module-content:content", p.contentUri()); assertEquals("text/markdown", p.contentType()); assertEquals("1.0", p.contentVersion());
        assertEquals("0.11.0", p.metadata().version()); assertEquals("DRAFT", p.metadata().status());
        assertEquals("NEEDS_EXPERT_REVIEW", p.metadata().reviewStatus()); assertNull(p.metadata().reviewedBy()); assertNull(p.metadata().reviewedAt());
        for (Teaching t : p.teachings()) {
            assertFalse(t.metadata().id().isBlank()); assertEquals("0.11.0", t.metadata().version());
            assertEquals("DRAFT", t.metadata().status()); assertEquals("NEEDS_EXPERT_REVIEW", t.metadata().reviewStatus());
            assertNull(t.metadata().reviewedBy()); assertNull(t.metadata().reviewedAt()); assertFalse(t.skillName().isBlank());
            assertEquals(first.current().payload().teachings().stream().filter(old -> old.skillId().equals(t.skillId())).findFirst().orElseThrow().metadata().id(), t.metadata().id());
        }
        assertEquals("expert-b", second.history().getLast().actorId());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.update(first.id(), first.lockVersion(), input("Stale")));
    }
    @Test void rejectsMissingMultipleAndDuplicatePrimaryAndNonpositivePrice() {
        Save valid = input("Test");
        for (List<TeachingInput> mappings : List.of(List.<TeachingInput>of(), List.of(new TeachingInput("skill", "SUPPORTING", "LOW")),
                List.of(new TeachingInput("skill", "PRIMARY", "LOW"), new TeachingInput("support", "PRIMARY", "LOW")),
                List.of(new TeachingInput("skill", "PRIMARY", "LOW"), new TeachingInput("skill", "SUPPORTING", "LOW")))) {
            assertThrows(IllegalArgumentException.class, () -> service.create(new Save(valid.title(), valid.moduleType(), valid.contentId(), valid.duration(), valid.price(), valid.occupationIds(), mappings)));
        }
        assertThrows(IllegalArgumentException.class, () -> service.create(new Save("T", valid.moduleType(), valid.contentId(), 1, BigDecimal.ZERO, valid.occupationIds(), valid.teachings())));
    }
    @Test void anyOwningOccupationGrantAllowsSharedEditsButCannotChangeScopeMembership() {
        content = new Content("content", "Shared lesson", "# Shared", "text/markdown", "1.0", List.of("occ", "other"), "expert-a", ModuleAuthoring.now());
        when(port.contents("org")).thenReturn(List.of(content));
        when(port.catalog("Occupation")).thenReturn(List.of(new Choice("occ", "First occupation"), new Choice("other", "Other occupation")));
        when(port.occupations(any())).thenReturn(List.of("occ", "other"));
        Save base = input("Shared");
        Save shared = new Save(base.title(), base.moduleType(), base.contentId(), base.duration(), base.price(), List.of("occ", "other"), base.teachings());
        Document doc = service.create(shared);
        actor = new Actor("expert-b", "org", Set.of("EXPERT"));
        when(port.occupations(any())).thenReturn(List.of("other"));
        Document updated = service.update(doc.id(), doc.lockVersion(), shared);
        assertEquals("expert-a", updated.createdBy()); assertEquals("expert-b", updated.current().editedBy());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.update(updated.id(), updated.lockVersion(), base));
    }
    @Test void deniesUnassignedExpertsAndManagerAuthoringAndExpertApproval() {
        Document doc = service.create(input("Test"));
        String id = doc.id();
        when(port.occupations(any())).thenReturn(List.of());
        assertEquals(0, service.list("", "", "", "", "", 1).total());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.detail(id));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.create(input("Unauthorized")));
        when(port.occupations(any())).thenReturn(List.of("occ"));
        doc = service.action(doc.id(), doc.lockVersion(), "submit", null);
        Document submitted = doc;
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.update(submitted.id(), submitted.lockVersion(), input("Cannot edit submitted")));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.action(submitted.id(), submitted.lockVersion(), "approve", null));
        manager(); assertThrows(ModuleAuthoringService.Failure.class, () -> service.create(input("Manager cannot author")));
    }
    @Test void releasesRevisionsPinsOldLearningAndRequiresReapprovalAfterRestore() {
        Document doc = release(service.create(input("Original")));
        assertEquals("ld-reviewer", doc.current().payload().metadata().reviewedBy());
        assertNotNull(doc.current().payload().metadata().reviewedAt());
        assertEquals("ACTIVE", doc.current().payload().metadata().status());
        actor = new Actor("learner", "org", Set.of("EMPLOYEE"));
        assertEquals("Original", service.learning(doc.id(), true).payload().title());
        actor = new Actor("expert-b", "org", Set.of("EXPERT"));
        doc = release(service.update(doc.id(), doc.lockVersion(), input("New")));
        actor = new Actor("learner", "org", Set.of("EMPLOYEE"));
        assertEquals("Original", service.learning(doc.id(), true).payload().title());
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        doc = service.action(doc.id(), doc.lockVersion(), "request-archive", null);
        manager(); doc = service.action(doc.id(), doc.lockVersion(), "approve-archive", null);
        assertTrue(doc.archived());
        actor = new Actor("learner", "org", Set.of("EMPLOYEE")); assertEquals("Original", service.learning(doc.id(), false).payload().title());
        actor = new Actor("new-learner", "org", Set.of("EMPLOYEE")); Document archived = doc;
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.learning(archived.id(), true));
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        Document restored = service.action(doc.id(), doc.lockVersion(), "restore", null);
        assertEquals("DRAFT", restored.current().state()); assertEquals("DRAFT", restored.current().payload().metadata().status());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.delete(restored.id(), restored.lockVersion()));
    }
    @Test void keepsCommittedPendingPublicationForRetryAndDoesNotFabricateReleaseOnFailure() {
        Document doc = service.create(input("Test")); doc = service.action(doc.id(), doc.lockVersion(), "submit", null); manager();
        doThrow(new IllegalStateException("Graph unavailable")).when(port).project(any(), any(), anyBoolean()); Document submitted = doc;
        assertThrows(IllegalStateException.class, () -> service.action(submitted.id(), submitted.lockVersion(), "approve", null));
        Document pending = documents.get(doc.id()); assertEquals("PUBLISH_PENDING", pending.current().state()); assertNull(pending.releasedRevision());
        doNothing().when(port).project(any(), any(), anyBoolean());
        Document released = service.action(doc.id(), pending.lockVersion(), "retry", null);
        assertEquals("RELEASED", released.current().state()); assertEquals(1, released.releasedRevision());
    }
    @Test void refusesArchiveWithoutAnotherPrimaryProviderAndBlocksReferencedDraftDeletion() {
        Document doc = release(service.create(input("Test")));
        actor = new Actor("expert-a", "org", Set.of("EXPERT")); doc = service.action(doc.id(), doc.lockVersion(), "request-archive", null); manager();
        when(port.retainsCoverage(any())).thenReturn(false); Document request = doc;
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.action(request.id(), request.lockVersion(), "approve-archive", null));
        actor = new Actor("expert-a", "org", Set.of("EXPERT")); Document draft = service.create(input("Draft"));
        when(port.referenced(any())).thenReturn(true);
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.delete(draft.id(), draft.lockVersion()));
    }
}
