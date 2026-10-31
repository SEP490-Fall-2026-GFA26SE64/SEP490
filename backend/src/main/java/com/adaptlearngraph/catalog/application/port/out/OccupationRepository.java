package com.adaptlearngraph.catalog.application.port.out;

import com.adaptlearngraph.catalog.domain.Occupation;
import java.util.List;
import java.util.Optional;

public interface OccupationRepository {
    List<Occupation> findAllOccupations();
    List<Occupation> findAllOccupations(String organizationId);
    Optional<Occupation> findByIdOrCode(String idOrCode);
    Optional<Occupation> findByIdOrCode(String organizationId, String idOrCode);
    Occupation save(Occupation occupation);
    Occupation save(String organizationId, Occupation occupation);
    void delete(String idOrCode);
    void delete(String organizationId, String idOrCode);
}

