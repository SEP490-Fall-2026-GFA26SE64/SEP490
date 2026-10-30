package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.LearningModuleRecord;

import java.util.List;
import java.util.Optional;

public interface ManageLearningModuleUseCase {
    List<LearningModuleRecord> listModules(String organizationId);
    Optional<LearningModuleRecord> getModule(String organizationId, String id);
    LearningModuleRecord saveModule(String organizationId, LearningModuleRecord module);
    void deleteModule(String organizationId, String id);
}
