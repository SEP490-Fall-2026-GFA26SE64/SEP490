package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.MacroCompetencyRepository;
import com.adaptlearngraph.entities.MacroCompetency;

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
