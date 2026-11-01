package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.MacroCompetency;

import java.util.List;

public interface GetMacroCompetenciesUseCase {
    List<MacroCompetency> listMacroCompetencies(String organizationId);
}
