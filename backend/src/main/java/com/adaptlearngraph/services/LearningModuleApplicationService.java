package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.LearningModuleDto.LearningModuleResponse;
import com.adaptlearngraph.dtos.LearningModuleDto.SaveLearningModuleRequest;
import com.adaptlearngraph.entities.domain.LearningModuleRecord;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.modelmapper.ModelMapper;

/** DTO boundary of the legacy learning-module catalog API. */
public class LearningModuleApplicationService {
    private final ManageLearningModuleUseCase modules;
    private final ModelMapper mapper;

    public LearningModuleApplicationService(ManageLearningModuleUseCase modules, ModelMapper mapper) {
        this.modules = Objects.requireNonNull(modules, "modules");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<LearningModuleResponse> listModules(String organizationId) {
        return modules.listModules(organizationId).stream().map(this::toResponse).toList();
    }

    public Optional<LearningModuleResponse> getModule(String organizationId, String id) {
        return modules.getModule(organizationId, id).map(this::toResponse);
    }

    public LearningModuleResponse createModule(String organizationId, SaveLearningModuleRequest request) {
        String id = request.code() != null && !request.code().isBlank() ? request.code().trim() : request.id();
        return toResponse(modules.saveModule(organizationId, module(id, request)));
    }

    public LearningModuleResponse updateModule(String organizationId, String id, SaveLearningModuleRequest request) {
        return toResponse(modules.saveModule(organizationId, module(id, request)));
    }

    public void deleteModule(String organizationId, String id) {
        modules.deleteModule(organizationId, id);
    }

    private static LearningModuleRecord module(String id, SaveLearningModuleRequest request) {
        return new LearningModuleRecord(
                id,
                id,
                request.title(),
                request.moduleType() != null ? request.moduleType() : "LESSON_AND_PRACTICE",
                request.contentUri() != null ? request.contentUri() : "",
                request.contentType() != null ? request.contentType() : "text/markdown",
                request.contentVersion() != null ? request.contentVersion() : "1.0",
                request.version() != null ? request.version() : "0.9.0",
                request.status() != null ? request.status() : "ACTIVE",
                request.reviewStatus() != null ? request.reviewStatus() : "NEEDS_EXPERT_REVIEW",
                request.durationMinutes() != null && request.durationMinutes() > 0 ? request.durationMinutes() : 45,
                request.teachesSkillIds() != null ? request.teachesSkillIds() : List.of(),
                List.of());
    }

    private LearningModuleResponse toResponse(LearningModuleRecord module) {
        return mapper.map(module, LearningModuleResponse.class);
    }
}