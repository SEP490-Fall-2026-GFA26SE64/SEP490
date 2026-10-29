package com.adaptlearngraph.catalog.application.port.out;

import com.adaptlearngraph.catalog.domain.Occupation;
import java.util.List;
import java.util.Optional;

public interface OccupationRepository {
    List<Occupation> findAllOccupations();
    Optional<Occupation> findByIdOrCode(String idOrCode);
    Occupation save(Occupation occupation);
    void delete(String idOrCode);
}

