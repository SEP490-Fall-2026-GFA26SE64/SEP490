package com.adaptlearngraph.competency.application.port.out;

import com.adaptlearngraph.competency.domain.MacroCompetency;

import java.util.List;

public interface MacroCompetencyRepository {
    List<MacroCompetency> findAll();
}
