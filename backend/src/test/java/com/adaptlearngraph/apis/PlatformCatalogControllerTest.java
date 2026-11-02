package com.adaptlearngraph.apis;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.advice.RegistrationExceptionHandler;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.repository.PlatformCatalogTemplate;
import com.adaptlearngraph.services.PlatformCatalogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PlatformCatalogControllerTest {
    private static MockMvc mvc(Optional<PlatformCatalogTemplate> template) {
        return MockMvcBuilders.standaloneSetup(new PlatformCatalogController(new PlatformCatalogService(() -> template)))
                .setControllerAdvice(new RegistrationExceptionHandler()).build();
    }

    private static PlatformCatalogTemplate template() throws Exception {
        try (var input = PlatformCatalogControllerTest.class.getResourceAsStream("/platform-catalog/template-fixture.json")) {
            return new PlatformCatalogTemplate(input.readAllBytes(), new ObjectMapper());
        }
    }

    @Test
    void graphExposesOnlySelectablePlatformTemplateNodesWithPublicCaching() throws Exception {
        mvc(Optional.of(template())).perform(get(ApiEndpoints.PLATFORM_CATALOG))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("public")))
                .andExpect(jsonPath("$.version").value("fixture-1"))
                .andExpect(jsonPath("$.nodes[*].label", everyItem(org.hamcrest.Matchers.in(
                        new String[] {"Occupation", "TargetRole", "MicroSkill", "LearningModule"}))))
                .andExpect(jsonPath("$.nodes[*].id", hasItem("ROLE-A")))
                .andExpect(jsonPath("$.nodes[*]", everyItem(not(org.hamcrest.Matchers.hasKey("organizationId")))));
    }

    @Test
    void closureReturnsServerComputedCountsWithoutCaching() throws Exception {
        mvc(Optional.of(template())).perform(post(ApiEndpoints.REGISTRATION_CATALOG_CLOSURE)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nodeIds\":[\"ROLE-A\"]}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(jsonPath("$.selected[0]").value("ROLE-A"))
                .andExpect(jsonPath("$.nodeCount").value(10))
                .andExpect(jsonPath("$.relationshipCount").value(10))
                .andExpect(jsonPath("$.nodesByLabel.MicroSkill").value(3));
    }

    @Test
    void closureRejectsUnknownNodesAsFieldErrors() throws Exception {
        mvc(Optional.of(template())).perform(post(ApiEndpoints.REGISTRATION_CATALOG_CLOSURE)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nodeIds\":[\"not-a-template-node\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.field").value("catalogSelection"));
    }

    @Test
    void missingTemplateIsReportedAsUnavailable() throws Exception {
        mvc(Optional.empty()).perform(get(ApiEndpoints.PLATFORM_CATALOG)).andExpect(status().isServiceUnavailable());
    }
}