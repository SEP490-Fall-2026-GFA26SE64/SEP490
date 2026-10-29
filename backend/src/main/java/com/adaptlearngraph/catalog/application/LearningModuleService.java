package com.adaptlearngraph.catalog.application;

import com.adaptlearngraph.catalog.application.port.in.ManageLearningModuleUseCase;
import com.adaptlearngraph.catalog.application.port.out.LearningModuleRepository;
import com.adaptlearngraph.catalog.domain.LearningModuleRecord;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

public class LearningModuleService implements ManageLearningModuleUseCase {
    private final LearningModuleRepository repository;

    public LearningModuleService(LearningModuleRepository repository) {
        this.repository = Objects.requireNonNull(repository, "repository cannot be null");
    }

    @Override
    public List<LearningModuleRecord> listModules(String organizationId) {
        return repository.findAll(organizationId);
    }

    @Override
    public Optional<LearningModuleRecord> getModule(String organizationId, String id) {
        return repository.findById(organizationId, id);
    }

    @Override
    public LearningModuleRecord saveModule(String organizationId, LearningModuleRecord module) {
        return repository.save(organizationId, module);
    }

    @Override
    public void deleteModule(String organizationId, String id) {
        repository.delete(organizationId, id);
    }
}
