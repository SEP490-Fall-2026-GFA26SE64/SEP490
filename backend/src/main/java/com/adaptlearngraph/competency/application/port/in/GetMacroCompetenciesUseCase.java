package com.adaptlearngraph.competency.application.port.in;

import com.adaptlearngraph.competency.domain.MacroCompetency;

import java.util.List;

public interface GetMacroCompetenciesUseCase {
    List<MacroCompetency> listMacroCompetencies(String organizationId);
}
