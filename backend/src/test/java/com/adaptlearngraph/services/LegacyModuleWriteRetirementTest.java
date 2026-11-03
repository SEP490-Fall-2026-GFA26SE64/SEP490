package com.adaptlearngraph.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.apis.LearningModuleController;
import com.adaptlearngraph.helper.LearningModuleMappings;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.repository.LearningModuleRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class LegacyModuleWriteRetirementTest {
    @Test void obsoleteSaveAndDeleteCannotBypassRevisionOwnershipOrApproval() {
        var repository = mock(LearningModuleRepository.class);
        var service = new LearningModuleService(repository);
        var controller = new LearningModuleController(new LearningModuleApplicationService(service,
                ModelMapperFactory.create(List.of(new LearningModuleMappings()))));
        var save = assertThrows(UnsupportedOperationException.class, () -> service.saveModule("org", null));
        var delete = assertThrows(UnsupportedOperationException.class, () -> service.deleteModule("org", "module"));
        assertEquals(410, controller.retiredWrite(save).getStatusCode().value());
        assertEquals(410, controller.retiredWrite(delete).getStatusCode().value());
        verifyNoInteractions(repository);
    }
}
