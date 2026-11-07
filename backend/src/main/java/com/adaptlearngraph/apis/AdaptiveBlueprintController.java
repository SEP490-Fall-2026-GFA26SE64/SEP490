package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.responseDto.AdaptiveBlueprintPayloads.*;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.services.AdaptiveBlueprintListing.*;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("(local | demo) & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled"}, havingValue = "true")
@RequestMapping(value = ApiEndpoints.ADAPTIVE_BLUEPRINT, produces = "application/json")
public final class AdaptiveBlueprintController {
    private final AdaptiveBlueprintUseCase blueprints;
    private final ObjectMapper requests;
    private final Validator validator;

    public AdaptiveBlueprintController(AdaptiveBlueprintUseCase blueprints, ObjectMapper mapper, Validator validator) {
        this.blueprints = blueprints;
        this.validator = validator;
        this.requests = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION);
        this.requests.setConfig(this.requests.getDeserializationConfig().without(MapperFeature.ALLOW_COERCION_OF_SCALARS));
    }

    @GetMapping
    ResponseEntity<Page> list(@RequestParam(defaultValue = "") String search, @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "NEWEST") Direction direction, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(required = false) String jobPositionId) {
        return ok(blueprints.list(new Query(search, status, direction, page, size, jobPositionId)));
    }

    @GetMapping("/job-positions/{jobPositionId}")
    ResponseEntity<WorkspaceResponse> workspace(@PathVariable String jobPositionId) {
        return ok(WorkspaceResponse.from(blueprints.getWorkspace(jobPositionId)));
    }

    @PutMapping(value = "/job-positions/{jobPositionId}/working", consumes = "application/json")
    ResponseEntity<WorkingResponse> save(@PathVariable String jobPositionId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        SaveRequest request = decode(body, SaveRequest.class);
        return ok(WorkingResponse.from(blueprints.saveResult(new Save(jobPositionId, request.expectedRevision(), key(key),
                request.configuration().domain(), request.expectedWorkingRevisionId()))));
    }

    @GetMapping("/job-positions/{jobPositionId}/versions/{blueprintId}/{version}")
    ResponseEntity<VersionDetailsResponse> version(@PathVariable String jobPositionId, @PathVariable java.util.UUID blueprintId,
            @PathVariable int version) {
        var value = blueprints.getVersion(jobPositionId, blueprintId, version);
        return ok(new VersionDetailsResponse(VersionResponse.from(value.version()), value.status().name()));
    }
    record VersionDetailsResponse(VersionResponse version, String status) {}

    @PostMapping(value = "/job-positions/{jobPositionId}/test", consumes = "application/json")
    ResponseEntity<PreviewResponse> test(@PathVariable String jobPositionId, @RequestBody String body) {
        TestRequest request = decode(body, TestRequest.class);
        return ok(PreviewResponse.from(blueprints.previewSaved(new PreviewSaved(jobPositionId, request.workingRevisionId(), request.expectedWorkingRevision()))));
    }

    @PostMapping(value = "/job-positions/{jobPositionId}/working/discard", consumes = "application/json")
    ResponseEntity<WorkingResponse> discard(@PathVariable String jobPositionId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        TestRequest request = decode(body, TestRequest.class);
        return ok(WorkingResponse.from(blueprints.discard(new PreviewSaved(jobPositionId,
                request.workingRevisionId(), request.expectedWorkingRevision()), key(key))));
    }

    @PostMapping(value = "/job-positions/{jobPositionId}/working/convert", consumes = "application/json")
    ResponseEntity<WorkingResponse> convert(@PathVariable String jobPositionId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        ConvertRequest request = decode(body, ConvertRequest.class);
        return ok(WorkingResponse.from(blueprints.convertLegacyDraft(new ConvertLegacyDraft(jobPositionId, request.workingRevisionId(),
                request.expectedWorkingRevision(), key(key), request.configuration().domain()))));
    }

    @PostMapping(value = "/job-positions/{jobPositionId}/finalize", consumes = "application/json")
    ResponseEntity<VersionResponse> finalizeBlueprint(@PathVariable String jobPositionId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        FinalizeRequest request = decode(body, FinalizeRequest.class);
        return ok(VersionResponse.from(blueprints.finalizeBlueprint(new Finalize(jobPositionId, request.workingRevisionId(),
                request.expectedWorkingRevision(), request.expectedActivationRevision(), key(key), request.expectedCurrent(), confirmsCurrent(body)))));
    }

    @PostMapping(value = "/job-positions/{jobPositionId}/disable", consumes = "application/json")
    ResponseEntity<ActivationResponse> disable(@PathVariable String jobPositionId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        DisableRequest request = decode(body, DisableRequest.class);
        return ok(ActivationResponse.from(blueprints.disable(new Disable(jobPositionId, request.expectedActivationRevision(), key(key), request.reason(),
                request.expectedCurrent(), confirmsCurrent(body)))));
    }

    @ExceptionHandler(Failure.class)
    ResponseEntity<ApiError> failure(Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case CATALOG_REFERENCE_INVALID, INSUFFICIENT_CAPACITY, PARAMETER_COVERAGE_MISSING, ASSESSMENT_POLICY_REQUIRED -> HttpStatus.UNPROCESSABLE_ENTITY;
            case BLUEPRINT_STALE, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT -> HttpStatus.CONFLICT;
            case DEPENDENCY_UNAVAILABLE, BASELINE_RESOURCES_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(new ApiError(failure.code().name(),
                failure.getMessage(), failure.shortages().stream().map(ShortageResponse::from).toList()));
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class, MissingRequestHeaderException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> invalid(Exception cause) {
        return failure(new Failure(Code.INVALID_REQUEST, "Invalid adaptive Blueprint request", List.of()));
    }
    @ExceptionHandler({IllegalStateException.class,org.springframework.dao.DataAccessException.class})
    ResponseEntity<ApiError> unavailable(Exception cause) {
        return failure(new Failure(Code.DEPENDENCY_UNAVAILABLE,"Baseline source temporarily unavailable",List.of()));
    }

    private <T> T decode(String body, Class<T> type) {
        if (body.length() > 65_536) throw new IllegalArgumentException("Request too large");
        try {
            var tree = requests.readTree(body);
            var configuration = tree == null ? null : tree.get("configuration");
            if (configuration != null && configuration.has("jobPositionBounds")
                    && (configuration.has("exploration") || configuration.has("roles"))) {
                throw new IllegalArgumentException("Mixed configuration scopes");
            }
            T request = requests.readValue(body, type);
            if (request == null || !validator.validate(request).isEmpty()) throw new IllegalArgumentException("Invalid fields");
            return request;
        } catch (JsonProcessingException invalid) { throw new IllegalArgumentException("Invalid JSON", invalid); }
    }

    private static String key(String key) {
        if (key.isBlank() || key.length() > 200 || !key.equals(key.strip()) || key.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Invalid idempotency key");
        }
        return key;
    }

    private boolean confirmsCurrent(String body) {
        try { return requests.readTree(body).has("expectedCurrent"); }
        catch (JsonProcessingException invalid) { throw new IllegalArgumentException("Invalid JSON", invalid); }
    }

    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
