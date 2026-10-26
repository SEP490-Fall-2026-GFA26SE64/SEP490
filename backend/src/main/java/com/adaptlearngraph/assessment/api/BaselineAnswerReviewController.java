package com.adaptlearngraph.assessment.api;

import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.AnswerReview;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.Failure;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("local")
@ConditionalOnProperty(prefix = "assessment.baseline.legacy-authoring", name = "enabled", havingValue = "true")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.answer-review", name = "enabled", havingValue = "true")
@RequestMapping("/api/v1/ld/baseline-assessments")
public class BaselineAnswerReviewController {
    private final BaselineAnswerReviewUseCase review;
    private final ObjectMapper json;

    public BaselineAnswerReviewController(BaselineAnswerReviewUseCase review, ObjectMapper json) {
        this.review = review;
        this.json = json;
    }

    @GetMapping("/assessment-versions/{assessmentVersionId}/protected-answers")
    ResponseEntity<AnswerReviewResponse> reveal(@PathVariable UUID assessmentVersionId) {
        AnswerReview revealed = review.reveal(assessmentVersionId);
        List<AnswerItemResponse> items = revealed.items().stream()
                .map(item -> new AnswerItemResponse(item.itemVersionId(), parse(item.protectedKeyJson())))
                .toList();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(new AnswerReviewResponse(revealed.assessmentVersionId(), items));
    }

    @ExceptionHandler(Failure.class)
    ResponseEntity<ApiError> failure(Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(new ApiError(failure.code().name(), failure.getMessage()));
    }

    private JsonNode parse(String value) {
        try {
            return json.readTree(value);
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Stored protected key is invalid JSON", invalid);
        }
    }

    record AnswerReviewResponse(UUID assessmentVersionId, List<AnswerItemResponse> items) {}
    record AnswerItemResponse(UUID itemVersionId, JsonNode protectedKey) {}
    record ApiError(String code, String message) {}
}
