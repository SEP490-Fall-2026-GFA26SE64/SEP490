package com.adaptlearngraph.apis;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.helper.LearningContentMappings;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.ModuleAuthoringMappings;
import com.adaptlearngraph.services.LearningContentApplicationService;
import com.adaptlearngraph.services.LearningContentService;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import java.util.List;
import org.junit.jupiter.api.Test;

class ManualPathwayRetirementTest {
    @Test void retiredEndpointsNeverReadOrCreateAssignments() {
        var service = mock(LearningContentService.class);
        var mapper = ModelMapperFactory.create(List.of(new ModuleAuthoringMappings(), new LearningContentMappings()));
        var controller = new LearningContentController(new LearningContentApplicationService(service, null, null, null, mapper));
        var read = assertThrows(Failure.class, controller::pathways);
        assertEquals(410, controller.failure(read).getStatusCode().value());
        var write = assertThrows(Failure.class, () -> controller.assign(
                new LearningContentController.Assignment("learner", "Test", List.of("module"))));
        assertEquals(410, controller.failure(write).getStatusCode().value());
        verifyNoInteractions(service);
    }
}
