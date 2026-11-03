package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.MacroCompetencyResponse;
import com.adaptlearngraph.services.MacroCompetencyApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiEndpoints.MACRO_COMPETENCY)
public class MacroCompetencyController {

    private final MacroCompetencyApplicationService macroCompetencies;

    public MacroCompetencyController(MacroCompetencyApplicationService macroCompetencies) {
        this.macroCompetencies = macroCompetencies;
    }

    @GetMapping
    public ResponseEntity<List<MacroCompetencyResponse>> listMacroCompetencies(
            @PathVariable("organizationId") String organizationId) {
        return ResponseEntity.ok(macroCompetencies.listMacroCompetencies(organizationId));
    }
}