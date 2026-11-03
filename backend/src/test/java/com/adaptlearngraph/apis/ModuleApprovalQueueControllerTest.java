package com.adaptlearngraph.apis;

import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModuleAuthoringMappings;
import com.adaptlearngraph.services.ModuleAuthoringApplicationService;
import com.adaptlearngraph.services.ModuleAuthoringService;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Page;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ModuleApprovalQueueControllerTest {
    private static ModuleAuthoringController controller(ModuleAuthoringService service) {
        return new ModuleAuthoringController(new ModuleAuthoringApplicationService(service,
                ModelMapperFactory.create(List.of(new ModuleAuthoringMappings()))));
    }

    @Test void existingListDefaultsToFullWorkspace() throws Exception {
        var service = mock(ModuleAuthoringService.class);
        when(service.list("", "", "", "", "", 1, false)).thenReturn(new Page(List.of(), 0, 1, 10));
        MockMvcBuilders.standaloneSetup(controller(service)).build()
                .perform(get("/api/v1/module-management/modules"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        verify(service).list("", "", "", "", "", 1, false);
    }
    @Test void pendingQueuePreservesSearchAndPagination() throws Exception {
        var service = mock(ModuleAuthoringService.class);
        when(service.list("SQL", "", "", "", "", 2, true)).thenReturn(new Page(List.of(), 12, 2, 10));
        MockMvcBuilders.standaloneSetup(controller(service)).build()
                .perform(get("/api/v1/module-management/modules").param("pendingOnly", "true").param("search", "SQL").param("page", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(12)).andExpect(jsonPath("$.page").value(2));
        verify(service).list("SQL", "", "", "", "", 2, true);
    }
}
