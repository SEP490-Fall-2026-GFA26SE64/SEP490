package com.adaptlearngraph.apis;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.entities.domain.LearningContent.Lesson;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Actor;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Content;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Save;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.TeachingInput;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModuleAuthoringMappings;
import com.adaptlearngraph.services.ModuleAuthoringApplicationService;
import com.adaptlearngraph.services.ModuleAuthoringService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** Module drafts and lessons are translated explicitly; invalid lessons are rejected while reading the request. */
class ModuleAuthoringControllerTest {
    private static final String PATH = "/api/v1/module-management";

    private final ModuleAuthoringService service = mock(ModuleAuthoringService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ModuleAuthoringController(new ModuleAuthoringApplicationService(
            service, ModelMapperFactory.create(List.of(new ModuleAuthoringMappings()))))).build();

    @Test
    void sessionReturnsTheTrustedActor() throws Exception {
        when(service.session()).thenReturn(new Actor("expert-1", "org-1", Set.of("EXPERT")));

        mvc.perform(get(PATH + "/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("expert-1"))
                .andExpect(jsonPath("$.organizationId").value("org-1"))
                .andExpect(jsonPath("$.roles[0]").value("EXPERT"));
    }

    @Test
    void createTranslatesTheModuleDraft() throws Exception {
        mvc.perform(post(PATH + "/modules").contentType("application/json")
                        .content("{\"title\":\"Intro\",\"moduleType\":\"LESSON_AND_PRACTICE\",\"contentId\":\"content-1\","
                                + "\"duration\":30,\"price\":150000.50,\"occupationIds\":[\"occ-1\"],"
                                + "\"teachings\":[{\"skillId\":\"skill-1\",\"teachingFocus\":\"PRIMARY\",\"difficultyLevel\":\"LOW\"}]}"))
                .andExpect(status().isCreated());
        verify(service).create(new Save("Intro", "LESSON_AND_PRACTICE", "content-1", 30, new BigDecimal("150000.50"),
                List.of("occ-1"), List.of(new TeachingInput("skill-1", "PRIMARY", "LOW"))));
    }

    @Test
    void lessonsAreValidatedAndTranslated() throws Exception {
        var lesson = new Lesson("lesson-1", "Intro", "TEXT", "Body", "MARKDOWN", 60, "ESTIMATED", null, null, null);
        when(service.lessons(eq("Intro"), eq(List.of(lesson)), eq(List.of()))).thenReturn(new Content("content-1", "Intro", "",
                "text/markdown", "1.0.0", List.of(), "expert-1", "2026-10-01T00:00:00Z", List.of(lesson)));

        mvc.perform(post(PATH + "/contents/lessons").contentType("application/json")
                        .content("{\"title\":\"Intro\",\"occupationIds\":[],\"lessons\":[{\"id\":\"lesson-1\",\"title\":\"Intro\","
                                + "\"type\":\"TEXT\",\"body\":\"Body\",\"bodyFormat\":\"MARKDOWN\",\"durationSeconds\":60,"
                                + "\"durationSource\":\"ESTIMATED\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("content-1"))
                .andExpect(jsonPath("$.lessons[0].id").value("lesson-1"))
                .andExpect(jsonPath("$.lessons[0].durationSeconds").value(60.0));

        mvc.perform(post(PATH + "/contents/lessons").contentType("application/json")
                        .content("{\"title\":\"Intro\",\"lessons\":[{\"id\":\"bad id!\",\"title\":\"Intro\",\"type\":\"TEXT\","
                                + "\"body\":\"Body\",\"bodyFormat\":\"MARKDOWN\",\"durationSeconds\":60,\"durationSource\":\"ESTIMATED\"}]}"))
                .andExpect(status().isBadRequest());
        verify(service).lessons(anyString(), any(), anyList());
    }
}