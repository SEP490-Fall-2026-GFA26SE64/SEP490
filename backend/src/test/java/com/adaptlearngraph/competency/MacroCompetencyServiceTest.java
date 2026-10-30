package com.adaptlearngraph.competency;

import com.adaptlearngraph.competency.application.MacroCompetencyService;
import com.adaptlearngraph.competency.application.port.out.MacroCompetencyRepository;
import com.adaptlearngraph.competency.domain.MacroCompetency;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MacroCompetencyServiceTest {

    @Mock
    private MacroCompetencyRepository repository;

    @InjectMocks
    private MacroCompetencyService service;

    @Test
    @DisplayName("listMacroCompetencies delegates to repository and returns list")
    void listMacroCompetencies_delegatesToRepository() {
        Instant now = Instant.now();
        List<MacroCompetency> expected = List.of(
                new MacroCompetency("id-1", "KNOWLEDGE", "Knowledge", "Technical knowledge", "ACTIVE", now, now)
        );

        when(repository.findAll()).thenReturn(expected);

        List<MacroCompetency> actual = service.listMacroCompetencies("org-test");

        assertEquals(1, actual.size());
        assertEquals("KNOWLEDGE", actual.get(0).code());
        assertEquals("Technical knowledge", actual.get(0).description());
    }
}
