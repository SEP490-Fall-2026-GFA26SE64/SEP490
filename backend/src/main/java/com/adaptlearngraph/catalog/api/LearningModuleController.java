package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.api.LearningModuleDto.LearningModuleResponse;
import com.adaptlearngraph.catalog.api.LearningModuleDto.SaveLearningModuleRequest;
import com.adaptlearngraph.catalog.application.port.in.ManageLearningModuleUseCase;
import com.adaptlearngraph.catalog.domain.LearningModuleRecord;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/modules")
public class LearningModuleController {
    private final ManageLearningModuleUseCase manageLearningModuleUseCase;

    public LearningModuleController(ManageLearningModuleUseCase manageLearningModuleUseCase) {
        this.manageLearningModuleUseCase = Objects.requireNonNull(manageLearningModuleUseCase, "manageLearningModuleUseCase cannot be null");
    }

    @GetMapping
    public ResponseEntity<List<LearningModuleResponse>> listModules(
            @PathVariable("organizationId") String organizationId) {
        List<LearningModuleResponse> list = manageLearningModuleUseCase.listModules(organizationId)
                .stream()
                .map(LearningModuleResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LearningModuleResponse> getModule(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        return manageLearningModuleUseCase.getModule(organizationId, id)
                .map(LearningModuleResponse::fromDomain)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<LearningModuleResponse> createModule(
            @PathVariable("organizationId") String organizationId,
            @RequestBody SaveLearningModuleRequest request) {
        String id = request.code() != null && !request.code().isBlank() ? request.code().trim() : request.id();
        LearningModuleRecord record = new LearningModuleRecord(
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
                List.of()
        );
        LearningModuleRecord saved = manageLearningModuleUseCase.saveModule(organizationId, record);
        return ResponseEntity.status(HttpStatus.CREATED).body(LearningModuleResponse.fromDomain(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LearningModuleResponse> updateModule(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody SaveLearningModuleRequest request) {
        LearningModuleRecord record = new LearningModuleRecord(
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
                List.of()
        );
        LearningModuleRecord saved = manageLearningModuleUseCase.saveModule(organizationId, record);
        return ResponseEntity.ok(LearningModuleResponse.fromDomain(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModule(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        manageLearningModuleUseCase.deleteModule(organizationId, id);
        return ResponseEntity.noContent().build();
    }
}
