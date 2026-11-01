package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.Occupation;
import java.util.List;

public interface GetOccupationsUseCase {
    List<Occupation> listOccupations();
    List<Occupation> listOccupations(String organizationId);
    Occupation saveOccupation(Occupation occupation);
    Occupation saveOccupation(String organizationId, Occupation occupation);
    void deleteOccupation(String idOrCode);
    void deleteOccupation(String organizationId, String idOrCode);
}

