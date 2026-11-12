package com.adaptlearngraph.apis;

import com.adaptlearngraph.entities.domain.ModuleAuthoring.Actor;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Choice;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModuleAuthoringMappings;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.services.ModuleAuthoringApplicationService;
import com.adaptlearngraph.services.ModuleAuthoringService;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ModuleSkillChoicesControllerTest {
    @Test void authoringCatalogUsesExistingAuthenticatedServiceAndChoiceProjection() throws Exception {
        var port = mock(ModuleAuthoringPort.class);
        when(port.actor()).thenReturn(new Actor("expert", "org", Set.of("EXPERT")));
        when(port.catalog("ModuleSkill")).thenReturn(List.of(new Choice("skill", "Approved skill")));
        var service = new ModuleAuthoringService(port);
        var mvc = MockMvcBuilders.standaloneSetup(new ModuleAuthoringController(new ModuleAuthoringApplicationService(
                service, ModelMapperFactory.create(List.of(new ModuleAuthoringMappings()))))).build();
        mvc.perform(get("/api/v1/module-management/catalog/ModuleSkill"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value("skill"))
                .andExpect(jsonPath("$[0].name").value("Approved skill"));
        verify(port).catalog("ModuleSkill");
        when(port.actor()).thenReturn(new Actor("learner", "org", Set.of("EMPLOYEE")));
        assertEquals(403, assertThrows(ModuleAuthoringService.Failure.class, () -> service.choices("ModuleSkill")).status());
        verify(port, times(1)).catalog("ModuleSkill");
    }
}
