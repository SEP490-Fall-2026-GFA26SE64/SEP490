package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.application.*;
import com.adaptlearngraph.catalog.application.ModuleAuthoringService.Failure;
import com.adaptlearngraph.catalog.application.port.out.*;
import com.adaptlearngraph.catalog.domain.*;
import com.adaptlearngraph.catalog.domain.LearningResources.*;

import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.*;

@RestController
@Profile("local")
@RequestMapping("/api/v1/module-management")
public class LearningContentController {
    private final com.adaptlearngraph.catalog.application.port.in.LearningImportUseCase imports;
    private final LearningContentService service;
    private final ModuleAuthoringPort modules;
    private final LearningAssetPort files;

    public LearningContentController(
            LearningContentService service,
            ModuleAuthoringPort modules,
            LearningAssetPort files,
            com.adaptlearngraph.catalog.application.port.in.LearningImportUseCase imports) {
        this.imports = imports;
        this.service = service;
        this.modules = modules;
        this.files = files;
    }

    @GetMapping("/imports/template")
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=learning-modules.xlsx")
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(imports.template());
    }

    @PostMapping("/imports")
    public com.adaptlearngraph.catalog.application.port.in.LearningImportUseCase.Preview preview(
            @RequestParam("file") MultipartFile file) throws java.io.IOException {
        try (var input = file.getInputStream()) {
            return imports.preview(file.getOriginalFilename(), file.getSize(), input);
        }
    }

    @GetMapping("/imports/{id}")
    public com.adaptlearngraph.catalog.application.port.in.LearningImportUseCase.Preview validate(
            @PathVariable String id) {
        return imports.validate(id);
    }

    public record ImportConfirmation(boolean confirmOwnedDuplicates) {}

    @PostMapping("/imports/{id}/commit")
    public List<ModuleAuthoring.Document> commit(
            @PathVariable String id, @RequestBody ImportConfirmation input) {
        return imports.commit(id, input.confirmOwnedDuplicates());
    }

    @GetMapping("/upload-settings")
    public Limits limits() {
        return service.limits();
    }

    @PutMapping("/upload-settings")
    public Limits limits(@RequestBody Limits input) {
        return service.limits(input);
    }

    @PostMapping("/assets")
    public Asset upload(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        var a = modules.actor();
        if (!a.expert()) throw new Failure(403, "Expert upload required");
        try (var input = file.getInputStream()) {
            return files.upload(
                    a.organizationId(), a.id(), file.getOriginalFilename(), file.getSize(), input);
        }
    }

    @GetMapping("/assets/{id}")
    public ResponseEntity<StreamingResponseBody> asset(
            @PathVariable String id,
            @RequestHeader(value = "Range", required = false) String range) {
        Asset asset = service.accessibleAsset(id);
        long start = 0, end = asset.byteSize() - 1;
        boolean partial = range != null;
        if (partial) {
            if (!range.matches("bytes=\\d+-\\d*"))
                return ResponseEntity.status(416)
                        .header("Content-Range", "bytes */" + asset.byteSize())
                        .build();
            String[] parts = range.substring(6).split("-", -1);
            try {
                start = Long.parseLong(parts[0]);
                if (!parts[1].isEmpty()) end = Math.min(end, Long.parseLong(parts[1]));
            } catch (NumberFormatException e) {
                throw new Failure(416, "Invalid media range");
            }
            if (start > end || start >= asset.byteSize())
                return ResponseEntity.status(416)
                        .header("Content-Range", "bytes */" + asset.byteSize())
                        .build();
        }
        long offset = start, length = end - start + 1;
        var response =
                ResponseEntity.status(partial ? 206 : 200)
                        .header("Accept-Ranges", "bytes")
                        .header("Cache-Control", "private, no-store")
                        .header("X-Content-Type-Options", "nosniff")
                        .contentType(MediaType.parseMediaType(asset.mediaType()))
                        .contentLength(length);
        if (partial)
            response.header("Content-Range", "bytes " + start + "-" + end + "/" + asset.byteSize());
        return response.body(
                out -> {
                    try (var input = files.open(asset, offset, length)) {
                        input.transferTo(out);
                    }
                });
    }

    public record Verification(
            String provider, String url, double durationSeconds, boolean played) {}

    @PostMapping("/videos/verify")
    public Map<String, Boolean> verify(@RequestBody Verification input) {
        var a = modules.actor();
        if (!a.expert() && !a.manager()) throw new Failure(403, "Staff preview required");
        if (!input.played()) throw new Failure(400, "Play this video in preview first");
        files.verifyExternal(
                a.organizationId(), a.id(), input.provider(), input.url(), input.durationSeconds());
        return Map.of("verified", true);
    }

    public record Render(String body, String format) {}

    @PostMapping("/text/preview")
    public Map<String, String> render(@RequestBody Render input) {
        var a = modules.actor();
        if (!a.expert() && !a.manager() && !a.roles().contains("EMPLOYEE"))
            throw new Failure(403, "Learning access required");
        ModuleAuthoring.text(input.body(), "body", 500000);
        return Map.of(
                "html",
                input.format().equals("MARKDOWN")
                        ? files.renderMarkdown(input.body())
                        : files.sanitizedHtml(input.body()));
    }

    @GetMapping("/pathways")
    public List<Pathway> pathways() {
        return service.pathways();
    }

    public record Assignment(String learnerId, String title, List<String> moduleIds) {}

    @PostMapping("/pathways")
    public Pathway assign(@RequestBody Assignment input) {
        return service.assign(input.learnerId(), input.title(), input.moduleIds());
    }

    @GetMapping("/learning/{id}/view")
    public LearningView view(@PathVariable String id) {
        return service.view(id, false);
    }

    @PostMapping("/learning/{id}/begin")
    public LearningView begin(@PathVariable String id) {
        return service.view(id, true);
    }

    public record Update(
            int revision,
            double positionSeconds,
            Double segmentStart,
            Double segmentEnd,
            boolean reachedEnd,
            boolean complete) {}

    @PutMapping("/learning/{id}/lessons/{lessonId}/progress")
    public Progress progress(
            @PathVariable String id, @PathVariable String lessonId, @RequestBody Update input) {
        return service.progress(
                id,
                lessonId,
                input.positionSeconds(),
                input.segmentStart(),
                input.segmentEnd(),
                input.reachedEnd(),
                input.complete(),
                input.revision());
    }

    public record Switch(int revision) {}

    @PostMapping("/learning/{id}/switch")
    public LearningView change(@PathVariable String id, @RequestBody Switch input) {
        return service.switchVersion(id, input.revision());
    }

    public record Issue(String lessonId, String detail, String commandId) {}

    @PostMapping("/learning/{id}/issues")
    public ResponseEntity<Void> issue(@PathVariable String id, @RequestBody Issue input) {
        service.issue(id, input.lessonId(), input.detail(), input.commandId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications")
    public List<Notification> notifications() {
        return service.notifications();
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> read(@PathVariable String id) {
        service.read(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(Failure.class)
    public ResponseEntity<Map<String, String>> failure(Failure error) {
        return ResponseEntity.status(error.status()).body(Map.of("message", error.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("message", error.getMessage()));
    }
}
