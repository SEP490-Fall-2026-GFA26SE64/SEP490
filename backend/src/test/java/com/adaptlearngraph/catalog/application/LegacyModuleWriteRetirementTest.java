package com.adaptlearngraph.catalog.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.catalog.api.LearningModuleController;
import com.adaptlearngraph.catalog.application.port.out.LearningModuleRepository;
import org.junit.jupiter.api.Test;

class LegacyModuleWriteRetirementTest {
    @Test void obsoleteSaveAndDeleteCannotBypassRevisionOwnershipOrApproval() {
        var repository = mock(LearningModuleRepository.class);
        var service = new LearningModuleService(repository);
        var controller = new LearningModuleController(service);
        var save = assertThrows(UnsupportedOperationException.class, () -> service.saveModule("org", null));
        var delete = assertThrows(UnsupportedOperationException.class, () -> service.deleteModule("org", "module"));
        assertEquals(410, controller.retiredWrite(save).getStatusCode().value());
        assertEquals(410, controller.retiredWrite(delete).getStatusCode().value());
        verifyNoInteractions(repository);
    }
}
