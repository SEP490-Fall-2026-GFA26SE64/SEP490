package com.adaptlearngraph.apis;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.adaptlearngraph.entities.domain.OrganizationKnowledgeGraph;
import com.adaptlearngraph.services.OrganizationKnowledgeGraphService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(OrganizationKnowledgeGraphController.class)
class OrganizationKnowledgeGraphControllerTest {
    @Autowired
    private MockMvc mvc;
    @SuppressWarnings("removal")
    @MockBean
    private OrganizationKnowledgeGraphService graphs;

    @Test
    @WithMockUser
    void returnsNodesAndEdgesWithNullableFieldsWithoutCaching() throws Exception {
        UUID organization = UUID.randomUUID();
        when(graphs.graph(organization)).thenReturn(new OrganizationKnowledgeGraph(List.of(
                new OrganizationKnowledgeGraph.Node("s1", "MicroSkill", "REST", "S1", "Design REST", "ACTIVE", "APPROVED"),
                new OrganizationKnowledgeGraph.Node("c1", "Certificate", "REST cert", null, null, "ACTIVE", null)),
                List.of(new OrganizationKnowledgeGraph.Edge("REQUIRES_CERTIFICATE:s1:c1", "s1", "c1", "REQUIRES_CERTIFICATE"))));

        mvc.perform(get("/api/v1/organizations/" + organization + "/knowledge-graph"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.nodes[0].label").value("MicroSkill"))
                .andExpect(jsonPath("$.nodes[0].reviewStatus").value("APPROVED"))
                .andExpect(jsonPath("$.nodes[1].code").doesNotExist())
                .andExpect(jsonPath("$.edges[0].from").value("s1"))
                .andExpect(jsonPath("$.edges[0].to").value("c1"))
                .andExpect(jsonPath("$.edges[0].type").value("REQUIRES_CERTIFICATE"));
    }
}
