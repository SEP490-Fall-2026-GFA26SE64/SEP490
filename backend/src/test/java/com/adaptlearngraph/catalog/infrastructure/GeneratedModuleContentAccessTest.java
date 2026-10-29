package com.adaptlearngraph.catalog.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import com.adaptlearngraph.catalog.application.port.out.ModuleAuthoringPort;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring;
import com.adaptlearngraph.catalog.domain.LearningContent;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Dependency;

class GeneratedModuleContentAccessTest {
    @Test void entryRequiresExactContentVersionAndNoUnsupportedInternalGates() {
        var modules=mock(ModuleAuthoringPort.class);
        var document=mock(ModuleAuthoring.Document.class);
        var revision=mock(ModuleAuthoring.Revision.class);
        var payload=mock(ModuleAuthoring.Package.class);
        var content=mock(ModuleAuthoring.Content.class);
        var org=UUID.randomUUID();var learner=UUID.randomUUID();
        var scope=new InitialPathwayPorts.Scope(org,learner);
        when(modules.documents(org.toString())).thenReturn(List.of(document));
        when(document.id()).thenReturn("M-A");when(document.released()).thenReturn(revision);
        when(modules.pinned(org.toString(),learner.toString(),"M-A")).thenReturn(Optional.empty());
        when(revision.payload()).thenReturn(payload);when(payload.contentVersion()).thenReturn("v1");
        when(payload.content()).thenReturn(content);when(content.lessons()).thenReturn(List.of(mock(LearningContent.Lesson.class)));
        var access=new ModuleAuthoringConfiguration().modulePathwayContentAccess(modules);
        assertEquals("/employee/modules/M-A",access.requireEntry(scope,"M-A","v1",List.of()));
        assertThrows(InitialPathwayPorts.Failure.class,()->access.requireEntry(scope,"M-A","v2",List.of()));
        assertThrows(InitialPathwayPorts.Failure.class,()->access.requireEntry(scope,"M-A","v1",List.of(mock(Dependency.class))));
        assertThrows(InitialPathwayPorts.Failure.class,()->access.requireEntry(scope,"other","v1",List.of()));
        when(content.lessons()).thenReturn(List.of());
        assertThrows(InitialPathwayPorts.Failure.class,()->access.requireEntry(scope,"M-A","v1",List.of()));
    }
}
