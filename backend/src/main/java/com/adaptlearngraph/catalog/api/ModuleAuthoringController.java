package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.application.ModuleAuthoringService;
import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import com.adaptlearngraph.catalog.domain.ModuleAuthoring.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@Profile("local")
@RequestMapping("/api/v1/module-management")
public class ModuleAuthoringController {
    private final ModuleAuthoringService service;
    public ModuleAuthoringController(ModuleAuthoringService service) { this.service = service; }
    // Occupation hints from legacy clients are ignored for new content.
    public record ContentInput(String title, String markdown, List<String> occupationIds) {}
    public record GrantInput(String expertId, String occupationId, boolean active) {}
    public record UpdateInput(long expectedVersion, Save value) {}
    public record ActionInput(long expectedVersion, String action, String feedback) {}
    @GetMapping("/session") public Actor session() { return service.session(); }
    @GetMapping("/catalog/{kind}") public List<Choice> catalog(@PathVariable String kind) { return service.choices(kind); }
    @GetMapping("/grants") public List<Grant> grants() { return service.grants(); }
    @PutMapping("/grants") public ResponseEntity<Void> grant(@RequestBody GrantInput input) {
        service.grant(input.expertId(), input.occupationId(), input.active()); return ResponseEntity.noContent().build();
    }
    @GetMapping("/contents") public List<Content> contents() { return service.contents(); }
    @PostMapping("/contents") public ResponseEntity<Content> content(@RequestBody ContentInput input) {
        return ResponseEntity.status(201).body(service.content(input.title(), input.markdown(), input.occupationIds()));
    }
    public record LessonsInput(String title, List<com.adaptlearngraph.catalog.domain.LearningContent.Lesson> lessons, List<String> occupationIds) {}
    @PostMapping("/contents/lessons") public ResponseEntity<Content> lessons(@RequestBody LessonsInput input) {
        return ResponseEntity.status(201).body(service.lessons(input.title(), input.lessons(), input.occupationIds()));
    }
    @GetMapping("/modules") public Page list(@RequestParam(defaultValue="") String search,
            @RequestParam(defaultValue="") String status, @RequestParam(defaultValue="") String review,
            @RequestParam(defaultValue="") String type, @RequestParam(defaultValue="") String skill,
            @RequestParam(defaultValue="1") int page) { return service.list(search, status, review, type, skill, page); }
    @GetMapping("/modules/{id}") public Document detail(@PathVariable String id) { return service.detail(id); }
    @GetMapping("/module-list") public CatalogPage catalogList(@RequestParam(defaultValue="") String search,
            @RequestParam(defaultValue="") String status, @RequestParam(defaultValue="") String review,
            @RequestParam(defaultValue="") String type, @RequestParam(defaultValue="") String skill,
            @RequestParam(defaultValue="1") int page) { return service.catalogList(search, status, review, type, skill, page); }
    public record IntakeInput(List<String> occupationIds, String expectedAssignedAt, String expertId) {}
    @PostMapping("/catalog-modules/{id}/assignment") public ResponseEntity<Intake> assign(@PathVariable String id, @RequestBody IntakeInput input) {
        return ResponseEntity.status(201).body(service.assignIntake(id, input.occupationIds(), input.expectedAssignedAt(), input.expertId()));
    }
    @PostMapping("/catalog-modules/{id}/accept") public ResponseEntity<Document> accept(@PathVariable String id) {
        return ResponseEntity.status(201).body(service.acceptIntake(id));
    }
    @PostMapping("/modules") public ResponseEntity<Document> create(@RequestBody Save input) { return ResponseEntity.status(201).body(service.create(input)); }
    @PutMapping("/modules/{id}") public Document update(@PathVariable String id, @RequestBody UpdateInput input) { return service.update(id, input.expectedVersion(), input.value()); }
    @PostMapping("/modules/{id}/actions") public Document action(@PathVariable String id, @RequestBody ActionInput input) { return service.action(id, input.expectedVersion(), input.action(), input.feedback()); }
    @DeleteMapping("/modules/{id}") public ResponseEntity<Void> delete(@PathVariable String id, @RequestParam long expectedVersion) { service.delete(id, expectedVersion); return ResponseEntity.noContent().build(); }
    @GetMapping("/learning/{id}") public Revision learning(@PathVariable String id) { return service.learning(id, false); }
    @PostMapping("/learning/{id}/start") public Revision start(@PathVariable String id) { return service.learning(id, true); }
    @ExceptionHandler(Failure.class) public ResponseEntity<Map<String,String>> failure(Failure error) { return ResponseEntity.status(error.status()).body(Map.of("message", error.getMessage())); }
    @ExceptionHandler({IllegalArgumentException.class, NullPointerException.class}) public ResponseEntity<Map<String,String>> invalid(RuntimeException error) {
        return ResponseEntity.badRequest().body(Map.of("message", error.getMessage() == null ? "Missing required fields" : error.getMessage()));
    }
}
