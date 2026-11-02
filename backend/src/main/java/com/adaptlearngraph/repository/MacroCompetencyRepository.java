package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.MacroCompetency;

import java.util.List;

public interface MacroCompetencyRepository {
    List<MacroCompetency> findAll(String organizationId);
}
