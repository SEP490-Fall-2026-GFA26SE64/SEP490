package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.MacroCompetencyResponse;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/** DTO boundary of the macro-competency catalog API. */
public class MacroCompetencyApplicationService {
    private final GetMacroCompetenciesUseCase macroCompetencies;
    private final ModelMapper mapper;

    public MacroCompetencyApplicationService(GetMacroCompetenciesUseCase macroCompetencies, ModelMapper mapper) {
        this.macroCompetencies = Objects.requireNonNull(macroCompetencies, "macroCompetencies");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<MacroCompetencyResponse> listMacroCompetencies(String organizationId) {
        return macroCompetencies.listMacroCompetencies(organizationId).stream()
                .map(macro -> mapper.map(macro, MacroCompetencyResponse.class))
                .toList();
    }
}