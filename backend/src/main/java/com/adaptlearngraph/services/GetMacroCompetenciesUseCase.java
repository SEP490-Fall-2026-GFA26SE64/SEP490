package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.MacroCompetency;

import java.util.List;

public interface GetMacroCompetenciesUseCase {
    List<MacroCompetency> listMacroCompetencies(String organizationId);
}
