package com.adaptlearngraph.competency.application;

import com.adaptlearngraph.competency.application.port.in.GetMacroCompetenciesUseCase;
import com.adaptlearngraph.competency.application.port.out.MacroCompetencyRepository;
import com.adaptlearngraph.competency.domain.MacroCompetency;

import java.util.List;

public class MacroCompetencyService implements GetMacroCompetenciesUseCase {

    private final MacroCompetencyRepository repository;

    public MacroCompetencyService(MacroCompetencyRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<MacroCompetency> listMacroCompetencies(String organizationId) {
        return repository.findAll();
    }
}
