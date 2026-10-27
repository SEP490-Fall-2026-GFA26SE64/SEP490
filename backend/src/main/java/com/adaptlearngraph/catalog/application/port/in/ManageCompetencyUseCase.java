package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.CompetencyRecord;
import java.util.List;

public interface ManageCompetencyUseCase {
    List<CompetencyRecord> listCompetencies(String search);
    CompetencyRecord createCompetency(String name, String description, List<String> skillIds, String levelId);
    CompetencyRecord updateCompetency(String id, String name, String description, List<String> skillIds);
    void deleteCompetency(String id);
}
