package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.entities.domain.ModuleAuthoring;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import org.junit.jupiter.api.BeforeEach;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
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
    com.adaptlearngraph.repository.ReviewSubmissionNotifications notices;
    Actor actor;
    Map<String, Document> documents;
    Map<String, Integer> pins;
    Content content;
    @BeforeEach void setup() {
        port = mock(ModuleAuthoringPort.class); notices = mock(com.adaptlearngraph.repository.ReviewSubmissionNotifications.class);
        service = new ModuleAuthoringService(port, null, notices);
        actor = new Actor("expert-a", "org", Set.of("EXPERT")); documents = new HashMap<>(); pins = new HashMap<>();
        content = new Content("content", "Lesson", "# Learn\nPractice the task.", "text/markdown", "1.0", List.of("occ"), "expert-a", ModuleAuthoring.now());
        when(port.actor()).thenAnswer(call -> actor);
        when(port.requireKnowledge(eq("org"),eq("skill"),eq("FOUNDATION"),any())).thenReturn(
                new KnowledgeDefinition(com.adaptlearngraph.entities.domain.KnowledgeLevel.FOUNDATION,"1.0",List.of()));
        when(port.transaction(any())).thenAnswer(call -> call.<Supplier<?>>getArgument(0).get());
        when(port.jobPositions(any())).thenReturn(List.of("occ"));
        when(port.catalog("Expert")).thenReturn(List.of(new Choice("expert-a", "Expert A")));
        when(port.catalog("JobPosition")).thenReturn(List.of(new Choice("occ", "JobPosition")));
        when(port.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill", "Skill"), new Choice("support", "Supporting skill")));
        when(port.contents("org")).thenReturn(List.of(content));
        when(port.lock(anyString(), anyString())).thenAnswer(call -> Optional.ofNullable(documents.get(call.getArgument(1))));
        when(port.managedModuleIds()).thenAnswer(call -> List.copyOf(documents.keySet()));
        when(port.documents("org")).thenAnswer(call -> List.copyOf(documents.values()));
        doAnswer(call -> { Document d = call.getArgument(0); documents.put(d.id(), d); return null; }).when(port).save(any());
        doAnswer(call -> { Document d = call.getArgument(0); documents.remove(d.id()); return null; }).when(port).delete(any());
        when(port.retainsCoverage(any())).thenReturn(true);
        when(port.pinned(anyString(), anyString(), anyString())).thenAnswer(call -> Optional.ofNullable(pins.get(call.getArgument(1) + ":" + call.getArgument(2))));
        doAnswer(call -> { pins.put(call.getArgument(1) + ":" + call.getArgument(2), call.getArgument(3)); return null; }).when(port).pin(anyString(), anyString(), anyString(), anyInt());
    }
    Save input(String title) { return new Save(title, "LESSON_AND_PRACTICE", "content", 90, List.of("occ"), List.of(new TeachingInput("skill")), "FOUNDATION", List.of()); }
    CatalogModule graph(String id, String title) {
        return new CatalogModule(new Metadata(id, "0.11.0", "ACTIVE", "NEEDS_EXPERT_REVIEW", null, null), title, "RESOURCE_GUIDED_PRACTICE", "https://example.org/lesson", "text/markdown", "1.3", 37, List.of(new CatalogTeaching(new Metadata("edge-" + id, "0.11.0", "ACTIVE", "NEEDS_EXPERT_REVIEW", null, null), "skill", "Skill", "PRIMARY", "MEDIUM")));
    }
    @Test void listsSharedNeo4jCatalogWithoutFabricatingHistoryAndCombinesScopedDraftsOnce() {
        Document own = service.create(input("Draft"));
        when(port.graphModules("org")).thenReturn(List.of(graph("legacy", "Existing catalog"), graph(own.id(), "Published title"), graph("private", "Other scope"), graph("foreign", "Other organization")));
        when(port.managedModuleIds()).thenReturn(List.of(own.id(), "private", "foreign"));
        CatalogPage result = service.catalogList("", "", "", "", "", 1);
        assertEquals(2, result.total());
        CatalogItem legacy = result.items().stream().filter(i -> i.module().metadata().id().equals("legacy")).findFirst().orElseThrow();
        assertNull(legacy.authoring()); assertNull(legacy.module().metadata().reviewedBy());
        assertEquals(37, legacy.module().duration()); assertFalse(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(legacy.module()).has("price"));
        assertEquals(own.id(), result.items().stream().filter(i -> i.authoring() != null).findFirst().orElseThrow().authoring().id());
        assertEquals(1, service.catalogList("published", "ACTIVE", "NEEDS_EXPERT_REVIEW", "RESOURCE_GUIDED_PRACTICE", "skill", 1).total());
        assertEquals(0, service.catalogList("", "", "APPROVED", "", "", 1).total());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.detail("legacy"));
        verify(port, never()).save(argThat(d -> d.id().equals("legacy")));
    }
    @Test void paginatesGraphCatalogDeterministicallyAndDoesNotUseScopeAsWritePermission() {
        when(port.jobPositions(any())).thenReturn(List.of());
        when(port.graphModules("org")).thenReturn(java.util.stream.IntStream.range(0, 23).mapToObj(i -> graph("catalog-" + i, String.format("Lesson %02d", i))).toList());
        CatalogPage result = service.catalogList("", "", "", "", "", 2);
        assertEquals(23, result.total()); assertEquals(10, result.items().size()); assertEquals("Lesson 10", result.items().getFirst().module().title());
        assertEquals(3, service.catalogList("", "", "", "", "", 999).page());
        Save base = input("No jobPosition");
        Document independent = service.create(new Save(base.title(), base.moduleType(), base.contentId(), base.duration(), null, base.teachings(), base.knowledgeLevel(), base.outcomeCodes()));
        assertTrue(independent.jobPositionIds().isEmpty());
        assertTrue(service.content("Independent content", "# Existing body", null).jobPositionIds().isEmpty());
        actor = new Actor("learner", "org", Set.of("EMPLOYEE"));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.catalogList("", "", "", "", "", 1));
    }
    void manager() { actor = new Actor("ld-reviewer", "org", Set.of("LD_MANAGER")); }
    Document release(Document doc) {
        doc = service.action(doc.id(), doc.lockVersion(), "submit", null); manager();
        return service.action(doc.id(), doc.lockVersion(), "approve", null);
    }
    @Test void persistsAllFieldsAndTracksResponsibleCreatorWithoutChangingPriorPayload() {
        Document first = service.create(input("First"));
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        Document second = service.update(first.id(), first.lockVersion(), input("Second"));
        assertEquals("expert-a", second.createdBy()); assertEquals("expert-a", second.current().editedBy());
        assertEquals("First", second.revisions().getFirst().payload().title());
        assertEquals("Second", second.current().payload().title()); assertEquals(2, second.revisions().size());
        var p = second.current().payload(); assertEquals(90, p.duration()); assertFalse(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(p).has("price"));
        assertEquals("module-content:content", p.contentUri()); assertEquals("text/markdown", p.contentType()); assertEquals("1.0", p.contentVersion());
        assertEquals("0.12.0", p.metadata().version()); assertEquals("DRAFT", p.metadata().status());
        assertEquals("NEEDS_EXPERT_REVIEW", p.metadata().reviewStatus()); assertNull(p.metadata().reviewedBy()); assertNull(p.metadata().reviewedAt());
        for (Teaching t : p.teachings()) {
            assertFalse(t.metadata().id().isBlank()); assertEquals("0.12.0", t.metadata().version());
            assertEquals("DRAFT", t.metadata().status()); assertEquals("NEEDS_EXPERT_REVIEW", t.metadata().reviewStatus());
            assertNull(t.metadata().reviewedBy()); assertNull(t.metadata().reviewedAt()); assertFalse(t.skillName().isBlank()); assertNull(t.teachingFocus()); assertNull(t.difficultyLevel());
            assertEquals(first.current().payload().teachings().stream().filter(old -> old.skillId().equals(t.skillId())).findFirst().orElseThrow().metadata().id(), t.metadata().id());
        }
        assertEquals("expert-a", second.history().getLast().actorId());
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.update(first.id(), first.lockVersion(), input("Stale")));
    }
    @Test void rejectsMissingMultipleAndDuplicateSkillsAndNonpositiveDuration() {
        Save valid = input("Test");
        for (List<TeachingInput> mappings : List.of(List.<TeachingInput>of(),
                List.of(new TeachingInput("skill", "PRIMARY", "LOW"), new TeachingInput("support", "PRIMARY", "LOW")),
                List.of(new TeachingInput("skill", "PRIMARY", "LOW"), new TeachingInput("skill", "SUPPORTING", "LOW")))) {
            assertThrows(Failure.class, () -> service.create(new Save(valid.title(), valid.moduleType(), valid.contentId(), valid.duration(), valid.jobPositionIds(), mappings, valid.knowledgeLevel(), valid.outcomeCodes())));
        }
        assertThrows(IllegalArgumentException.class, () -> service.create(new Save("T", valid.moduleType(), valid.contentId(), 0, valid.jobPositionIds(), valid.teachings(), valid.knowledgeLevel(), valid.outcomeCodes())));
    }
    @Test void sameJobPositionDoesNotGrantWriteAccessToAnotherExpert() {
        content = new Content("content", "Shared lesson", "# Shared", "text/markdown", "1.0", List.of("occ", "other"), "expert-a", ModuleAuthoring.now());
        when(port.contents("org")).thenReturn(List.of(content));
        when(port.catalog("JobPosition")).thenReturn(List.of(new Choice("occ", "First jobPosition"), new Choice("other", "Other jobPosition")));
        when(port.jobPositions(any())).thenReturn(List.of("occ", "other"));
        Save base = input("Shared");
        Save shared = new Save(base.title(), base.moduleType(), base.contentId(), base.duration(), List.of("occ", "other"), base.teachings(), base.knowledgeLevel(), base.outcomeCodes());
        Document doc = service.create(shared);
        actor = new Actor("expert-b", "org", Set.of("EXPERT"));
        when(port.jobPositions(any())).thenReturn(List.of("other"));
        assertEquals(doc, service.detail(doc.id()));
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> service.update(doc.id(), doc.lockVersion(), shared)).status());
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> service.action(doc.id(), doc.lockVersion(), "submit", null)).status());
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> service.delete(doc.id(), doc.lockVersion())).status());
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        Document updated = service.update(doc.id(), doc.lockVersion(), shared);
        assertEquals("expert-a", updated.createdBy()); assertEquals("expert-a", updated.current().editedBy());
        assertEquals(updated.jobPositionIds(), service.update(updated.id(), updated.lockVersion(), base).jobPositionIds());
    }
    @Test void expertCreationNeedsNoJobPositionGrantButManagerAuthoringAndExpertApprovalAreDenied() {
        Document doc = service.create(input("Test"));
        String id = doc.id();
        when(port.jobPositions(any())).thenReturn(List.of());
        assertEquals(1, service.list("", "", "", "", "", 1).total());
        assertEquals(id, service.detail(id).id());
        Save base = input("No jobPosition");
        Document independent = service.create(new Save(base.title(), base.moduleType(), base.contentId(), base.duration(), null, base.teachings(), base.knowledgeLevel(), base.outcomeCodes()));
        assertTrue(independent.jobPositionIds().isEmpty());
        assertTrue(service.content("Independent content", "# Existing body", null).jobPositionIds().isEmpty());
        when(port.jobPositions(any())).thenReturn(List.of("occ"));
        doc = service.action(doc.id(), doc.lockVersion(), "submit", null);
        Document submitted = doc;
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.update(submitted.id(), submitted.lockVersion(), input("Cannot edit submitted")));
        assertThrows(ModuleAuthoringService.Failure.class, () -> service.action(submitted.id(), submitted.lockVersion(), "approve", null));
        manager(); assertThrows(ModuleAuthoringService.Failure.class, () -> service.create(input("Manager cannot author")));
    }
    @Test void historicalJobPositionsAreRetainedButDoNotRestrictContentReuseOrOwnerEdits() {
        Document created = service.create(input("Legacy"));
        Document legacy = new Document(created.id(), created.organizationId(), List.of("old-jobPosition"), created.createdBy(), created.createdAt(), created.lockVersion(), created.everReleased(), created.archived(), created.releasedRevision(), created.revisions(), created.history(), created.intake());
        documents.put(legacy.id(), legacy);
        when(port.jobPositions(any())).thenReturn(List.of());
        Save base = input("Updated without jobPosition");
        Document updated = service.update(legacy.id(), legacy.lockVersion(), new Save(base.title(), base.moduleType(), base.contentId(), base.duration(), null, base.teachings(), base.knowledgeLevel(), base.outcomeCodes()));
        assertEquals(List.of("old-jobPosition"), updated.jobPositionIds());
        assertEquals(legacy.revisions().getFirst(), updated.revisions().getFirst());
        assertEquals("content", updated.current().payload().content().id());
        verify(port, never()).jobPositions(any());
    }

    @Test void releasesRevisionsPinsOldLearningAndRequiresReapprovalAfterRestore() {
        Document doc = release(service.create(input("Original")));
        assertEquals("ld-reviewer", doc.current().payload().metadata().reviewedBy());
        assertNotNull(doc.current().payload().metadata().reviewedAt());
        assertEquals("ACTIVE", doc.current().payload().metadata().status());
        actor = new Actor("learner", "org", Set.of("EMPLOYEE"));
        assertEquals("Original", service.learning(doc.id(), true).payload().title());
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
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
    @Test void pendingQueueFiltersWorkflowBeforePaginationAndKeepsCatalogUnchanged() {
        Document base = service.create(input("Queue fixture"));
        documents.clear();
        List<String> states = new ArrayList<>(Collections.nCopies(9, "SUBMITTED"));
        states.addAll(List.of("ARCHIVE_REQUESTED", "PUBLISH_PENDING", "ARCHIVE_PENDING", "DRAFT", "RETURNED", "RELEASED", "ARCHIVED"));
        for (int i = 0; i < states.size(); i++) {
            String id = String.format("module-%02d", i);
            Revision revision = new Revision(1, states.get(i), base.current().payload(), "expert-a", base.createdAt(), null, null, null);
            documents.put(id, new Document(id, "org", List.of("occ"), "expert-a", base.createdAt(), 1, false, false, null, List.of(revision), List.of()));
        }
        manager();
        Page first = service.list("", "", "", "", "", 1, true);
        Page second = service.list("", "", "", "", "", 2, true);
        assertEquals(12, first.total()); assertEquals(10, first.items().size());
        assertEquals(12, second.total()); assertEquals(2, second.items().size());
        assertEquals(Set.of("ARCHIVE_REQUESTED", "PUBLISH_PENDING", "ARCHIVE_PENDING"),
                java.util.stream.Stream.concat(first.items().stream(), second.items().stream()).map(d -> d.current().state()).filter(v -> !v.equals("SUBMITTED")).collect(java.util.stream.Collectors.toSet()));
        assertEquals(16, service.list("", "", "", "", "", 1).total());
        assertEquals(1, service.list("module-11", "", "", "", "", 1, true).total());
        assertEquals(0, service.list("module-12", "", "", "", "", 1, true).total());
    }
    @Test void pendingQueueRequiresManagerEvenWhenExpertCanReadCatalog() {
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class,
                () -> service.list("", "", "", "", "", 1, true)).status());
    }

    @Test void importRejectsInvalidAndOverlongModuleCodes() {
        for (String code : List.of("MOD JAVA!", "A".repeat(101))) {
            var e = assertThrows(Failure.class, () -> service.importModule(code, input("Imported"), false, null));
            assertEquals(400, e.status()); assertEquals("Invalid module code", e.getMessage());
        }
        assertTrue(documents.isEmpty());
    }
    @Test void importCannotTakeOverSharedCatalogModuleCode() {
        when(port.graphModules("org")).thenReturn(List.of(graph("MOD-SHARED", "Shared")));
        var e = assertThrows(Failure.class, () -> service.importModule("MOD-SHARED", input("Imported"), false, null));
        assertEquals(409, e.status()); assertTrue(e.getMessage().startsWith("Module code already exists and is not available for this import"));
        assertTrue(documents.isEmpty());
    }
    @Test void reimportOfOwnReleasedModuleNeedsConfirmationAndCreatesNewDraftRevision() {
        Document released = release(service.create(input("Original")));
        actor = new Actor("expert-a", "org", Set.of("EXPERT"));
        var e = assertThrows(Failure.class, () -> service.importModule(released.id(), input("Revised"), false, null));
        assertEquals(409, e.status()); assertTrue(e.getMessage().startsWith("Confirm importing a new revision of your module"));
        Document revised = service.importModule(released.id(), input("Revised"), true, released.lockVersion());
        assertEquals(2, revised.current().number()); assertEquals("DRAFT", revised.current().state());
        assertEquals("Revised", revised.current().payload().title()); assertEquals(1, revised.releasedRevision());
    }
    @Test void returnRequiresFeedbackOfAtMostTwoThousandCharacters() {
        Document submitted = service.action(service.create(input("Return me")).id(), 1, "submit", null); manager();
        for (String feedback : List.of(" ", "x".repeat(2001))) {
            var e = assertThrows(IllegalArgumentException.class, () -> service.action(submitted.id(), submitted.lockVersion(), "return", feedback));
            assertEquals("Invalid feedback", e.getMessage());
        }
        Document returned = service.action(submitted.id(), submitted.lockVersion(), "return", "x".repeat(2000));
        assertEquals("RETURNED", returned.current().state());
    }
    @Test void unknownModuleActionIsRejected() {
        Document doc = service.create(input("Unknown action")); manager();
        var e = assertThrows(Failure.class, () -> service.action(doc.id(), doc.lockVersion(), "publish", null));
        assertEquals(400, e.status()); assertEquals("Unknown action", e.getMessage());
        assertEquals("DRAFT", documents.get(doc.id()).current().state());
    }
}
