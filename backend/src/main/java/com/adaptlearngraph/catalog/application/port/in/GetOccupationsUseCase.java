package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.Occupation;
import java.util.List;

public interface GetOccupationsUseCase {
    List<Occupation> listOccupations();
    List<Occupation> listOccupations(String organizationId);
    Occupation saveOccupation(Occupation occupation);
    Occupation saveOccupation(String organizationId, Occupation occupation);
    void deleteOccupation(String idOrCode);
    void deleteOccupation(String organizationId, String idOrCode);
}

