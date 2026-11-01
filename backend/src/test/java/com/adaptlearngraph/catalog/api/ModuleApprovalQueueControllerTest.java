package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.Page;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ModuleApprovalQueueControllerTest {
    @Test void existingListDefaultsToFullWorkspace() throws Exception {
        var service = mock(ModuleAuthoringService.class);
        when(service.list("", "", "", "", "", 1, false)).thenReturn(new Page(List.of(), 0, 1, 10));
        MockMvcBuilders.standaloneSetup(new ModuleAuthoringController(service)).build()
                .perform(get("/api/v1/module-management/modules"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        verify(service).list("", "", "", "", "", 1, false);
    }
    @Test void pendingQueuePreservesSearchAndPagination() throws Exception {
        var service = mock(ModuleAuthoringService.class);
        when(service.list("SQL", "", "", "", "", 2, true)).thenReturn(new Page(List.of(), 12, 2, 10));
        MockMvcBuilders.standaloneSetup(new ModuleAuthoringController(service)).build()
                .perform(get("/api/v1/module-management/modules").param("pendingOnly", "true").param("search", "SQL").param("page", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(12)).andExpect(jsonPath("$.page").value(2));
        verify(service).list("SQL", "", "", "", "", 2, true);
    }
}
