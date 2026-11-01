package com.adaptlearngraph.catalog.api;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.catalog.application.LearningContentService;
import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import java.util.List;
import org.junit.jupiter.api.Test;

class ManualPathwayRetirementTest {
    @Test void retiredEndpointsNeverReadOrCreateAssignments() {
        var service = mock(LearningContentService.class);
        var controller = new LearningContentController(service, null, null, null);
        var read = assertThrows(Failure.class, controller::pathways);
        assertEquals(410, controller.failure(read).getStatusCode().value());
        var write = assertThrows(Failure.class, () -> controller.assign(
                new LearningContentController.Assignment("learner", "Test", List.of("module"))));
        assertEquals(410, controller.failure(write).getStatusCode().value());
        verifyNoInteractions(service);
    }
}
