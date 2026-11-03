package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.LearningContentDto.AssetResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ImportPreviewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LearningViewResponse;
import com.adaptlearngraph.dtos.LearningContentDto.LimitsRequest;
import com.adaptlearngraph.dtos.LearningContentDto.LimitsResponse;
import com.adaptlearngraph.dtos.LearningContentDto.NotificationResponse;
import com.adaptlearngraph.dtos.LearningContentDto.PathwayResponse;
import com.adaptlearngraph.dtos.LearningContentDto.ProgressResponse;
import com.adaptlearngraph.dtos.ModuleAuthoringDto.DocumentResponse;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.LearningContentApplicationService;
import com.adaptlearngraph.services.ModuleAuthoringService.Failure;
import com.adaptlearngraph.model.dtos.file.response.FileDownloadResponse;

import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.*;

@RestController
@Profile("local")
@RequestMapping(ApiEndpoints.LEARNING_CONTENT)
public class LearningContentController {
    private final LearningContentApplicationService content;

    public LearningContentController(LearningContentApplicationService content) {
        this.content = content;
    }

    @GetMapping("/imports/template")
    public ResponseEntity<byte[]> template() {
        return new FileDownloadResponse(
                        "learning-modules.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        content.importTemplate())
                .toResponseEntity();
    }

    @PostMapping("/imports")
    public ImportPreviewResponse preview(
            @RequestParam("file") MultipartFile file) throws java.io.IOException {
        try (var input = file.getInputStream()) {
            return content.previewImport(file.getOriginalFilename(), file.getSize(), input);
        }
    }

    @GetMapping("/imports/{id}")
    public ImportPreviewResponse validate(
            @PathVariable String id) {
        return content.validateImport(id);
    }

    public record ImportConfirmation(boolean confirmOwnedDuplicates) {}

    @PostMapping("/imports/{id}/commit")
    public List<DocumentResponse> commit(
            @PathVariable String id, @RequestBody ImportConfirmation input) {
        return content.commitImport(id, input.confirmOwnedDuplicates());
    }

    @GetMapping("/upload-settings")
    public LimitsResponse limits() {
        return content.limits();
    }

    @PutMapping("/upload-settings")
    public LimitsResponse limits(@RequestBody LimitsRequest input) {
        return content.limits(input);
    }

    @PostMapping("/assets")
    public AssetResponse upload(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        return content.upload(file, file.getOriginalFilename(), file.getSize());
    }
    @GetMapping("/assets/{id}")
    public ResponseEntity<StreamingResponseBody> asset(
            @PathVariable String id,
            @RequestHeader(value = "Range", required = false) String range) {
        var asset = content.asset(id);
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
                    try (var input = asset.open(offset, length)) {
                        input.transferTo(out);
                    }
                });
    }

    public record Verification(
            String provider, String url, double durationSeconds, boolean played) {}

    @PostMapping("/videos/verify")
    public Map<String, Boolean> verify(@RequestBody Verification input) {
        content.verifyVideo(input.provider(), input.url(), input.durationSeconds(), input.played());
        return Map.of("verified", true);
    }

    public record Render(String body, String format) {}

    @PostMapping("/text/preview")
    public Map<String, String> render(@RequestBody Render input) {
        return Map.of("html", content.render(input.body(), input.format()));
    }

    @GetMapping("/pathways")
    public List<PathwayResponse> pathways() {
        throw new Failure(410, "Manual learning pathway assignment is no longer available");
    }

    public record Assignment(String learnerId, String title, List<String> moduleIds) {}

    @PostMapping("/pathways")
    public PathwayResponse assign(@RequestBody Assignment input) {
        throw new Failure(410, "Manual learning pathway assignment is no longer available");
    }

    @GetMapping("/learning/{id}/view")
    public LearningViewResponse view(@PathVariable String id) {
        return content.view(id, false);
    }

    @PostMapping("/learning/{id}/begin")
    public LearningViewResponse begin(@PathVariable String id) {
        return content.view(id, true);
    }

    public record Update(
            int revision,
            double positionSeconds,
            Double segmentStart,
            Double segmentEnd,
            boolean reachedEnd,
            boolean complete) {}

    @PutMapping("/learning/{id}/lessons/{lessonId}/progress")
    public ProgressResponse progress(
            @PathVariable String id, @PathVariable String lessonId, @RequestBody Update input) {
        return content.progress(
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
    public LearningViewResponse change(@PathVariable String id, @RequestBody Switch input) {
        return content.switchVersion(id, input.revision());
    }

    public record Issue(String lessonId, String detail, String commandId) {}

    @PostMapping("/learning/{id}/issues")
    public ResponseEntity<Void> issue(@PathVariable String id, @RequestBody Issue input) {
        content.issue(id, input.lessonId(), input.detail(), input.commandId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications")
    public List<NotificationResponse> notifications() {
        return content.notifications();
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Void> read(@PathVariable String id) {
        content.read(id);
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