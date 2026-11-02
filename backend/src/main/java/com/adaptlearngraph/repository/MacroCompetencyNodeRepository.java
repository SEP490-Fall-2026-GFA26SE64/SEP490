package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.MacroCompetencyNode;
import java.util.List;
import org.springframework.data.repository.Repository;

/** Organization-scoped reads of {@code :MacroCompetency}; no unscoped CRUD is exposed. */
public interface MacroCompetencyNodeRepository extends Repository<MacroCompetencyNode, String> {

    List<MacroCompetencyNode> findAllByOrganizationIdOrderByCodeAsc(String organizationId);
}