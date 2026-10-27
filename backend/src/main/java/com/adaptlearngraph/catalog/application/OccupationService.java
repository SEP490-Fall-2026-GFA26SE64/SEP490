package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.port.in.GetOccupationsUseCase;
import com.adaptlearngraph.catalog.application.port.out.OccupationRepository;
import com.adaptlearngraph.catalog.domain.Occupation;

import java.util.List;
import java.util.Objects;

public class OccupationService implements GetOccupationsUseCase {
    private final OccupationRepository repository;

    public OccupationService(OccupationRepository repository) {
        this.repository = Objects.requireNonNull(repository, "repository cannot be null");
    }

    @Override
    public List<Occupation> listOccupations() {
        return repository.findAllOccupations();
    }

    @Override
    public Occupation saveOccupation(Occupation occupation) {
        return repository.save(occupation);
    }

    @Override
    public void deleteOccupation(String idOrCode) {
        repository.delete(idOrCode);
    }
}

