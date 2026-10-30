package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.api.MacroCompetencyController;
import com.adaptlearngraph.competency.application.port.in.GetMacroCompetenciesUseCase;
import com.adaptlearngraph.competency.domain.MacroCompetency;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MacroCompetencyController.class)
class MacroCompetencyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GetMacroCompetenciesUseCase getMacroCompetenciesUseCase;

    @Test
    @org.springframework.security.test.context.support.WithMockUser
    @DisplayName("GET /api/v1/organizations/{orgId}/macro-competencies returns list from use case")
    void listMacroCompetencies_returnsList() throws Exception {
        Instant now = Instant.now();
        List<MacroCompetency> macros = List.of(
                new MacroCompetency("macro-1", "KNOWLEDGE", "Technical & Domain Knowledge", "Core tech knowledge", "ACTIVE", now, now),
                new MacroCompetency("macro-2", "COMMUNICATION", "Communication & Collaboration", "Interpersonal collaboration", "ACTIVE", now, now)
        );

        given(getMacroCompetenciesUseCase.listMacroCompetencies("org-123")).willReturn(macros);

        mockMvc.perform(get("/api/v1/organizations/org-123/macro-competencies")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].code").value("KNOWLEDGE"))
                .andExpect(jsonPath("$[0].name").value("Technical & Domain Knowledge"))
                .andExpect(jsonPath("$[0].description").value("Core tech knowledge"))
                .andExpect(jsonPath("$[1].code").value("COMMUNICATION"));
    }
}
