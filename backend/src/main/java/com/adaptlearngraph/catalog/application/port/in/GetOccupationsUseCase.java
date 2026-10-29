package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.Occupation;
import java.util.List;

public interface GetOccupationsUseCase {
    List<Occupation> listOccupations();
    Occupation saveOccupation(Occupation occupation);
    void deleteOccupation(String idOrCode);
}

