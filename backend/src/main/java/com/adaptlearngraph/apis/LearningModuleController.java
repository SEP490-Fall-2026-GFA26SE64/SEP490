package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.LearningModuleDto.LearningModuleResponse;
import com.adaptlearngraph.dtos.LearningModuleDto.SaveLearningModuleRequest;
import com.adaptlearngraph.services.LearningModuleApplicationService;
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
@RequestMapping(ApiEndpoints.LEARNING_MODULE)
public class LearningModuleController {
    @org.springframework.web.bind.annotation.ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<java.util.Map<String, String>> retiredWrite(UnsupportedOperationException error) {
        return ResponseEntity.status(410).body(java.util.Map.of("message", error.getMessage()));
    }
    private final LearningModuleApplicationService modules;

    public LearningModuleController(LearningModuleApplicationService modules) {
        this.modules = Objects.requireNonNull(modules, "modules cannot be null");
    }

    @GetMapping
    public ResponseEntity<List<LearningModuleResponse>> listModules(
            @PathVariable("organizationId") String organizationId) {
        return ResponseEntity.ok(modules.listModules(organizationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LearningModuleResponse> getModule(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        return modules.getModule(organizationId, id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<LearningModuleResponse> createModule(
            @PathVariable("organizationId") String organizationId,
            @RequestBody SaveLearningModuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(modules.createModule(organizationId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LearningModuleResponse> updateModule(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody SaveLearningModuleRequest request) {
        return ResponseEntity.ok(modules.updateModule(organizationId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModule(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        modules.deleteModule(organizationId, id);
        return ResponseEntity.noContent().build();
    }
}