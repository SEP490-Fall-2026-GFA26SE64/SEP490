package com.adaptlearngraph.services;

import com.adaptlearngraph.apis.ModuleAuthoringController;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.LearningContent;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModuleAuthoringMappings;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Exercises retained historical compatibility and retired API rejection.
@SuppressWarnings("deprecation")
class ModuleIntakeRetirementTest {
    @Test void oldJavaEntryPointsCannotWriteForAnyActor() {
        var port = mock(ModuleAuthoringPort.class);
        var service = new ModuleAuthoringService(port);
        for (String role : List.of("EXPERT", "LD_MANAGER", "EMPLOYEE")) {
            when(port.actor()).thenReturn(new Actor("account", "org", Set.of(role)));
            assertEquals(410, assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("old", List.of())).status());
            assertEquals(410, assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("old", List.of(), null)).status());
            assertEquals(410, assertThrows(ModuleAuthoringService.Failure.class, () -> service.assignIntake("old", List.of(), null, "expert")).status());
            assertEquals(410, assertThrows(ModuleAuthoringService.Failure.class, () -> service.acceptIntake("old")).status());
        }
        verify(port, never()).saveIntake(any()); verify(port, never()).save(any());
        verify(port, never()).saveContent(anyString(), any()); verify(port, never()).project(any(), any(), anyBoolean());
    }
    @Test void removedHttpRoutesHaveNoHandler() throws Exception {
        var service = mock(ModuleAuthoringService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new ModuleAuthoringController(new ModuleAuthoringApplicationService(
                service, ModelMapperFactory.create(List.of(new ModuleAuthoringMappings()))))).build();
        for (String suffix : List.of("assignment", "accept")) {
            mvc.perform(post("/api/v1/module-management/catalog-modules/old/" + suffix)
                    .contentType("application/json").content("{}" )).andExpect(status().isNotFound());
        }
        verifyNoInteractions(service);
    }
    @Test void catalogDoesNotReadPendingAssignmentsOrInventAnOwner() {
        var port = mock(ModuleAuthoringPort.class);
        when(port.actor()).thenReturn(new Actor("expert", "org", Set.of("EXPERT")));
        when(port.graphModules("org")).thenReturn(List.of(new CatalogModule(
                new Metadata("old", "1", "ACTIVE", "APPROVED", null, null), "Catalog", "LESSON_AND_PRACTICE",
                null, null, null, null, List.of())));
        var item = new ModuleAuthoringService(port).catalogList("", "", "", "", "", 1).items().getFirst();
        assertNull(item.intake()); assertNull(item.authoring());
        verify(port, never()).intakes(anyString());
    }
    @Test void createAndImportKeepTheAuthenticatedAccountAsResponsibleOwner() {
        var port = mock(ModuleAuthoringPort.class);
        when(port.actor()).thenReturn(new Actor("importer", "org", Set.of("EXPERT")));
        when(port.transaction(any())).thenAnswer(c -> c.<Supplier<?>>getArgument(0).get());
        var lesson = new LearningContent.Lesson("lesson", "Title", "TEXT", "Content", "MARKDOWN", 60, "ESTIMATED", null, null, null);
        var content = new Content("content", "Title", "", LearningContent.MANIFEST_TYPE, "1", List.of(), "importer", "2026-11-18T00:00:00Z", List.of(lesson));
        when(port.contents("org")).thenReturn(List.of(content));
        when(port.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill", "Skill")));
        when(port.requireKnowledge("org", "skill", "FOUNDATION", List.of())).thenReturn(new KnowledgeDefinition(KnowledgeLevel.FOUNDATION, "1", List.of()));
        var service = new ModuleAuthoringService(port);
        var input = new Save("Title", "LESSON_AND_PRACTICE", "content", 1, List.of(), List.of(new TeachingInput("skill")), "FOUNDATION", List.of());
        for (Document document : List.of(service.create(input), service.importModule("imported-module", input, false, null))) {
            assertEquals("importer", document.createdBy()); assertEquals("org", document.organizationId());
            assertEquals("DRAFT", document.current().state()); assertNull(document.intake());
            assertNull(document.releasedRevision()); assertNull(document.current().decidedBy());
            assertNull(document.current().decidedAt());
        }
        verify(port, times(2)).save(any()); verify(port, never()).saveIntake(any());
    }
}
