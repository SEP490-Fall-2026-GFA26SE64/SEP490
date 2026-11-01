package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.LearningModuleRecord;

import java.util.List;
import java.util.Optional;

public interface LearningModuleRepository {
    List<LearningModuleRecord> findAll(String organizationId);
    Optional<LearningModuleRecord> findById(String organizationId, String id);
    LearningModuleRecord save(String organizationId, LearningModuleRecord module);
    void delete(String organizationId, String id);
}
