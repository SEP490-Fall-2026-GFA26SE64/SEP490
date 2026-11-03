package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.responseDto.MacroCompetencyResponse;
import com.adaptlearngraph.services.GetMacroCompetenciesUseCase;
import com.adaptlearngraph.entities.domain.MacroCompetency;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiEndpoints.MACRO_COMPETENCY)
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
