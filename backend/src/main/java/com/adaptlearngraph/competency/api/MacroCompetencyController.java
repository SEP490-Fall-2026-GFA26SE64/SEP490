package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.application.port.in.GetMacroCompetenciesUseCase;
import com.adaptlearngraph.competency.domain.MacroCompetency;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/macro-competencies")
public class MacroCompetencyController {

    private final GetMacroCompetenciesUseCase getMacroCompetenciesUseCase;

    public MacroCompetencyController(GetMacroCompetenciesUseCase getMacroCompetenciesUseCase) {
        this.getMacroCompetenciesUseCase = getMacroCompetenciesUseCase;
    }

    @GetMapping
    public ResponseEntity<List<MacroCompetencyResponse>> listMacroCompetencies(
            @PathVariable("organizationId") String organizationId) {
        List<MacroCompetency> macros = getMacroCompetenciesUseCase.listMacroCompetencies(organizationId);
        List<MacroCompetencyResponse> response = macros.stream()
                .map(MacroCompetencyResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }
}
