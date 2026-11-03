package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.ModuleAuthoringDto.ActorResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.CatalogPageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ChoiceResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ContentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.DocumentResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.GrantResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.IntakeResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.LessonRequest;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.ModuleInput;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.PageResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.RevisionResponse;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.ModuleAuthoringApplicationService;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@Profile("local")
@RequestMapping(ApiEndpoints.MODULE_AUTHORING)
public class ModuleAuthoringController {
    private final ModuleAuthoringApplicationService service;
    public ModuleAuthoringController(ModuleAuthoringApplicationService service) { this.service = service; }
    // Occupation hints from legacy clients are ignored for new content.
    public record ContentInput(String title, String markdown, List<String> occupationIds) {}
    public record GrantInput(String expertId, String occupationId, boolean active) {}
    public record UpdateInput(long expectedVersion, ModuleInput value) {}
    public record ActionInput(long expectedVersion, String action, String feedback) {}
    @GetMapping("/session") public ActorResponse session() { return service.session(); }
    @GetMapping("/catalog/{kind}") public List<ChoiceResponse> catalog(@PathVariable String kind) { return service.catalog(kind); }
    @GetMapping("/grants") public List<GrantResponse> grants() { return service.grants(); }
    @PutMapping("/grants") public ResponseEntity<Void> grant(@RequestBody GrantInput input) {
        service.grant(input.expertId(), input.occupationId(), input.active()); return ResponseEntity.noContent().build();
    }
    @GetMapping("/contents") public List<ContentResponse> contents() { return service.contents(); }
    @PostMapping("/contents") public ResponseEntity<ContentResponse> content(@RequestBody ContentInput input) {
        return ResponseEntity.status(201).body(service.content(input.title(), input.markdown(), input.occupationIds()));
    }
    public record LessonsInput(String title, List<LessonRequest> lessons, List<String> occupationIds) {}
    @PostMapping("/contents/lessons") public ResponseEntity<ContentResponse> lessons(@RequestBody LessonsInput input) {
        return ResponseEntity.status(201).body(service.lessons(input.title(), input.lessons(), input.occupationIds()));
    }
    @GetMapping("/modules") public PageResponse list(@RequestParam(defaultValue="") String search,
            @RequestParam(defaultValue="") String status, @RequestParam(defaultValue="") String review,
            @RequestParam(defaultValue="") String type, @RequestParam(defaultValue="") String skill,
            @RequestParam(defaultValue="1") int page, @RequestParam(defaultValue="false") boolean pendingOnly) { return service.list(search, status, review, type, skill, page, pendingOnly); }
    @GetMapping("/modules/{id}") public DocumentResponse detail(@PathVariable String id) { return service.detail(id); }
    @GetMapping("/module-list") public CatalogPageResponse catalogList(@RequestParam(defaultValue="") String search,
            @RequestParam(defaultValue="") String status, @RequestParam(defaultValue="") String review,
            @RequestParam(defaultValue="") String type, @RequestParam(defaultValue="") String skill,
            @RequestParam(defaultValue="1") int page) { return service.catalogList(search, status, review, type, skill, page); }
    public record IntakeInput(List<String> occupationIds, String expectedAssignedAt, String expertId) {}
    @PostMapping("/catalog-modules/{id}/assignment") public ResponseEntity<IntakeResponse> assign(@PathVariable String id, @RequestBody IntakeInput input) {
        return ResponseEntity.status(201).body(service.assignIntake(id, input.occupationIds(), input.expectedAssignedAt(), input.expertId()));
    }
    @PostMapping("/catalog-modules/{id}/accept") public ResponseEntity<DocumentResponse> accept(@PathVariable String id) {
        return ResponseEntity.status(201).body(service.acceptIntake(id));
    }
    @PostMapping("/modules") public ResponseEntity<DocumentResponse> create(@RequestBody ModuleInput input) { return ResponseEntity.status(201).body(service.create(input)); }
    @PutMapping("/modules/{id}") public DocumentResponse update(@PathVariable String id, @RequestBody UpdateInput input) { return service.update(id, input.expectedVersion(), input.value()); }
    @PostMapping("/modules/{id}/actions") public DocumentResponse action(@PathVariable String id, @RequestBody ActionInput input) { return service.action(id, input.expectedVersion(), input.action(), input.feedback()); }
    @DeleteMapping("/modules/{id}") public ResponseEntity<Void> delete(@PathVariable String id, @RequestParam long expectedVersion) { service.delete(id, expectedVersion); return ResponseEntity.noContent().build(); }
    @GetMapping("/learning/{id}") public RevisionResponse learning(@PathVariable String id) { return service.learning(id, false); }
    @PostMapping("/learning/{id}/start") public RevisionResponse start(@PathVariable String id) { return service.learning(id, true); }
    @ExceptionHandler(Failure.class) public ResponseEntity<Map<String,String>> failure(Failure error) { return ResponseEntity.status(error.status()).body(Map.of("message", error.getMessage())); }
    @ExceptionHandler({IllegalArgumentException.class, NullPointerException.class}) public ResponseEntity<Map<String,String>> invalid(RuntimeException error) {
        return ResponseEntity.badRequest().body(Map.of("message", error.getMessage() == null ? "Missing required fields" : error.getMessage()));
    }
}