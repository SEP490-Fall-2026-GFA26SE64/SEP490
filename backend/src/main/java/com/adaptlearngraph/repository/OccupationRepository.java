package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.Occupation;
import java.util.List;
import java.util.Optional;

public interface OccupationRepository {
    List<Occupation> findAllOccupations(String organizationId);
    Optional<Occupation> findByIdOrCode(String organizationId, String idOrCode);
    Occupation save(String organizationId, Occupation occupation);
    void delete(String organizationId, String idOrCode);
}

