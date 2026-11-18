package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.*;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.apis.ModuleAuthoringController;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModuleAuthoringMappings;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.*;
import java.util.function.Supplier;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ModuleResponsibilityTransferTest {
    ModuleAuthoringPort port;
    ModuleAuthoringService service;
    Actor actor;
    Document stored;
    static Document fixture(String creator, String owner, String state) {
        var content = new Content("content", "Lesson", "# Real body", "text/markdown", "1", List.of(), creator, "2026-11-18T00:00:00Z");
        var payload = new com.adaptlearngraph.entities.domain.ModuleAuthoring.Package(
                new Metadata("module", "0.12.0", "DRAFT", "NEEDS_EXPERT_REVIEW", null, null), "Module", "LESSON_AND_PRACTICE",
                "module-content:content", "text/markdown", "1", 1,
                List.of(new Teaching(new Metadata("edge", "1", "DRAFT", "NEEDS_EXPERT_REVIEW", null, null), "skill", "Skill")),
                content, KnowledgeLevel.FOUNDATION, List.of(), "1");
        return new Document("module", "org", List.of(), creator, "2026-11-18T00:00:00Z", 1, state.equals("RELEASED"),
                state.equals("ARCHIVED"), state.equals("RELEASED") ? 1 : null,
                List.of(new Revision(1, state, payload, creator, "2026-11-18T00:00:00Z", null, null, null)),
                List.of(new Event(1, 1, "CREATE", creator, "2026-11-18T00:00:00Z", "Created")), null, owner);
    }
    @BeforeEach void setup() {
        port = mock(ModuleAuthoringPort.class); service = new ModuleAuthoringService(port);
        actor = new Actor("manager", "org", Set.of("LD_MANAGER")); stored = fixture("creator", "owner-a", "DRAFT");
        when(port.actor()).thenAnswer(c -> actor);
        when(port.transaction(any())).thenAnswer(c -> c.<Supplier<?>>getArgument(0).get());
        when(port.lock(anyString(), anyString())).thenAnswer(c -> "module".equals(c.getArgument(1)) ? Optional.of(stored) : Optional.empty());
        when(port.catalog("Expert")).thenReturn(List.of(new Choice("owner-a", "A"), new Choice("owner-b", "B"), new Choice("owner-c", "C")));
        doAnswer(c -> { stored = c.getArgument(0); return null; }).when(port).save(any());
    }
    @Test void successiveTransfersRetainCreatorContentAndEveryPreviousOwner() {
        var original = stored;
        var b = service.transferResponsibility("module", 1, "owner-b");
        var c = service.transferResponsibility("module", 2, "owner-c");
        assertEquals("creator", c.createdBy()); assertEquals(original.createdAt(), c.createdAt());
        assertEquals(original.revisions(), c.revisions()); assertEquals(original.releasedRevision(), c.releasedRevision());
        assertEquals("owner-c", c.responsibleExpertId()); assertEquals(3, c.lockVersion());
        assertEquals(original.history().getFirst(), c.history().getFirst());
        var event = b.history().getLast();
        assertEquals("owner-a", event.previousResponsibleExpertId()); assertEquals("owner-b", event.responsibleExpertId());
        assertEquals("manager", event.actorId()); assertEquals("OWNER_TRANSFERRED", event.action());
        assertNotNull(java.time.Instant.parse(event.occurredAt()));
        assertEquals("owner-b", c.history().getLast().previousResponsibleExpertId());
        assertEquals("owner-c", c.history().getLast().responsibleExpertId());
        verify(port, never()).project(any(), any(), anyBoolean());
    }
    @Test void seedOwnershipCanTransferWithoutRewritingSeedAuthorship() {
        stored = fixture("DEVELOPMENT_SEED", "DEVELOPMENT_SEED", "RELEASED");
        var result = service.transferResponsibility("module", 1, "owner-b");
        assertEquals("DEVELOPMENT_SEED", result.createdBy()); assertEquals("owner-b", result.responsibleExpertId());
        assertEquals("DEVELOPMENT_SEED", result.history().getLast().previousResponsibleExpertId());
        assertEquals("RELEASED", result.current().state()); assertEquals(1, result.releasedRevision());
    }
    @Test void transfersPreserveEveryWorkflowState() {
        for (String state : List.of("DRAFT", "RETURNED", "SUBMITTED", "PUBLISH_PENDING", "RELEASED", "ARCHIVE_REQUESTED", "ARCHIVE_PENDING", "ARCHIVED")) {
            stored = fixture("creator", "owner-a", state); var original = stored;
            var result = service.transferResponsibility("module", 1, "owner-b");
            assertEquals(original.revisions(), result.revisions()); assertEquals(original.archived(), result.archived());
            assertEquals(original.everReleased(), result.everReleased()); assertEquals(original.releasedRevision(), result.releasedRevision());
        }
    }
    @Test void onlyManagerCanTransfer() {
        for (String role : List.of("EXPERT", "EMPLOYEE")) {
            actor = new Actor("owner-a", "org", Set.of(role));
            assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> service.transferResponsibility("module", 1, "owner-b")).status());
        }
        verify(port, never()).save(any());
    }
    @Test void rejectsForeignOrMissingModuleWithoutWrites() {
        actor = new Actor("foreign-manager", "foreign", Set.of("LD_MANAGER"));
        assertEquals(404, assertThrows(ModuleAuthoringService.Failure.class, () -> service.transferResponsibility("module", 1, "owner-b")).status());
        assertEquals(404, assertThrows(ModuleAuthoringService.Failure.class, () -> service.transferResponsibility("missing", 1, "owner-b")).status());
        verify(port, never()).save(any());
    }
    @Test void rejectsUnknownInactiveForeignOrMissingTarget() {
        for (String target : Arrays.asList(null, "", "unknown", "inactive", "foreign-expert")) {
            assertEquals(400, assertThrows(ModuleAuthoringService.Failure.class, () -> service.transferResponsibility("module", 1, target)).status());
        }
        verify(port, never()).save(any());
    }
    @Test void staleRequestsCannotOverwriteTransferAndSameOwnerDoesNotInventHistory() {
        assertSame(stored, service.transferResponsibility("module", 1, "owner-a"));
        verify(port, never()).save(any());
        service.transferResponsibility("module", 1, "owner-b");
        assertEquals(409, assertThrows(ModuleAuthoringService.Failure.class, () -> service.transferResponsibility("module", 1, "owner-c")).status());
        assertEquals("owner-b", stored.responsibleExpertId()); assertEquals(2, stored.history().size());
    }
    @Test void formerOwnerLosesEditRightsAndNewOwnerKeepsOwnershipAfterEdit() {
        service.transferResponsibility("module", 1, "owner-b");
        actor = new Actor("owner-a", "org", Set.of("EXPERT"));
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> service.update("module", 2, null)).status());
        actor = new Actor("owner-b", "org", Set.of("EXPERT"));
        when(port.contents("org")).thenReturn(List.of(stored.current().payload().content()));
        when(port.catalog("MicroSkill")).thenReturn(List.of(new Choice("skill", "Skill")));
        when(port.requireKnowledge("org", "skill", "FOUNDATION", List.of())).thenReturn(new KnowledgeDefinition(KnowledgeLevel.FOUNDATION, "1", List.of()));
        var input = new Save("Edited", "LESSON_AND_PRACTICE", "content", 1, List.of(), List.of(new TeachingInput("skill")), "FOUNDATION", List.of());
        var edited = service.update("module", 2, input);
        assertEquals("creator", edited.createdBy()); assertEquals("owner-b", edited.responsibleExpertId());
        assertEquals("owner-b", edited.current().editedBy());
        var submitted = service.action("module", edited.lockVersion(), "submit", null);
        assertEquals("owner-b", submitted.responsibleExpertId()); assertEquals("SUBMITTED", submitted.current().state());
    }
    @Test void legacyAndNullableJsonRoundTripPreserveOwnershipAndHistory() throws Exception {
        var json = new ObjectMapper();
        var old = json.valueToTree(stored); ((com.fasterxml.jackson.databind.node.ObjectNode)old).remove("responsibleExpertId");
        var restored = json.treeToValue(old, Document.class); assertEquals("creator", restored.responsibleExpertId());
        stored = fixture(null, null, "DRAFT");
        var transferred = service.transferResponsibility("module", 1, "owner-b");
        var reloaded = json.readValue(json.writeValueAsString(transferred), Document.class);
        assertNull(reloaded.createdBy()); assertNull(reloaded.history().getLast().previousResponsibleExpertId());
        assertEquals("owner-b", reloaded.responsibleExpertId()); assertEquals(transferred, reloaded);
    }
    @Test void httpContractReturnsSeparatedOwnerAndStructuredTransferHistory() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new ModuleAuthoringController(new ModuleAuthoringApplicationService(service,
                ModelMapperFactory.create(List.of(new ModuleAuthoringMappings()))))).build();
        mvc.perform(put("/api/v1/module-management/modules/module/responsible-expert").contentType("application/json")
                .content("{\"expectedVersion\":1,\"expertId\":\"owner-b\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.createdBy").value("creator"))
                .andExpect(jsonPath("$.responsibleExpertId").value("owner-b"))
                .andExpect(jsonPath("$.history[1].previousResponsibleExpertId").value("owner-a"))
                .andExpect(jsonPath("$.history[1].responsibleExpertId").value("owner-b"));
        actor = new Actor("owner-b", "org", Set.of("EXPERT"));
        mvc.perform(put("/api/v1/module-management/modules/module/responsible-expert").contentType("application/json")
                .content("{\"expectedVersion\":2,\"expertId\":\"owner-c\"}"))
                .andExpect(status().isForbidden());
    }
    @Test void forwardOwnerBackfillIsIdenticalAcrossSupportedDatabaseLineages() throws Exception {
        byte[] sql = new org.springframework.core.io.ClassPathResource("db/workspace-migration/V70__module_responsible_expert.sql").getInputStream().readAllBytes();
        for (String lineage : List.of("migration", "module-migration")) {
            try (var input = new org.springframework.core.io.ClassPathResource("db/" + lineage + "/V70__module_responsible_expert.sql").getInputStream()) {
                assertArrayEquals(sql, input.readAllBytes());
            }
        }
    }

}
