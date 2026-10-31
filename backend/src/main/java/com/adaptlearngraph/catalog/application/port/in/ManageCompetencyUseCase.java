package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.CompetencyRecord;
import java.util.List;

public interface ManageCompetencyUseCase {
    List<CompetencyRecord> listCompetencies(String organizationId, String search);
    CompetencyRecord createCompetency(String organizationId, String code, String name, String description, List<String> skillIds, String levelId);
    CompetencyRecord updateCompetency(String organizationId, String id, String code, String name, String description, List<String> skillIds);
    void deleteCompetency(String organizationId, String id);
}
