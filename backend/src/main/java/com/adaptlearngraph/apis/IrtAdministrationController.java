package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.IrtAdministrationDto.CandidateView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.RunView;
import com.adaptlearngraph.dtos.IrtAdministrationDto.SelectionResponse;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.IrtAdministrationApplicationService;
import com.adaptlearngraph.services.IrtAdministrationApplicationService.Failure;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** No actor/organization/roles in wire input. Identity owns route authentication; no permitAll chain is introduced. */
@RestController
@ConditionalOnProperty(prefix="assessment.baseline.irt-administration",name="enabled",havingValue="true")
@RequestMapping(value=ApiEndpoints.IRT_ADMINISTRATION,produces="application/json")
public final class IrtAdministrationController {
    private final IrtAdministrationApplicationService administration;
    public IrtAdministrationController(IrtAdministrationApplicationService administration) {
        this.administration=administration;
    }
    @PostMapping(value="/calibration-runs",consumes="application/json")
    public ResponseEntity<RunView> run(@PathVariable UUID bankId,@PathVariable UUID modelId,jakarta.servlet.http.HttpServletRequest body) {
        return ok(administration.run(bankId,modelId,body.getContentLengthLong(),body::getInputStream));
    }
    @GetMapping("/calibration-runs/{runId}")
    public ResponseEntity<RunView> read(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID runId) {
        return ok(administration.read(bankId,modelId,runId));
    }
    @GetMapping("/candidates/{candidateId}")
    public ResponseEntity<CandidateView> candidate(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID candidateId) {
        return ok(administration.candidate(bankId,modelId,candidateId));
    }
    @PostMapping("/calibration-runs/{runId}/recover-expired")
    public ResponseEntity<RunView> recover(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID runId) {
        return ok(administration.recoverExpired(bankId,modelId,runId));
    }
    @PostMapping("/calibration-runs/{runId}/cancel")
    public ResponseEntity<RunView> cancel(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID runId) {
        return ok(administration.cancel(bankId,modelId,runId));
    }
    @PostMapping(value="/promotions",consumes="application/json")
    public ResponseEntity<SelectionResponse> promote(@PathVariable UUID bankId,@PathVariable UUID modelId,
            @RequestHeader("Idempotency-Key") String key,jakarta.servlet.http.HttpServletRequest body) {
        return ok(administration.promote(bankId,modelId,key,body.getContentLengthLong(),body::getInputStream));
    }
    private <T> ResponseEntity<T> ok(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
    @ExceptionHandler(Failure.class)
    public ResponseEntity<Map<String,String>> failure(Failure failure) {
        HttpStatus status=switch(failure.code()) {
            case "UNAUTHENTICATED" -> HttpStatus.UNAUTHORIZED;
            case "FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "CONFLICT","NOT_READY" -> HttpStatus.CONFLICT;
            case "DEPENDENCY_UNAVAILABLE","RESOURCE_LIMIT","TIMEOUT" -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(Map.of("code",failure.code(),"message",failure.getMessage()));
    }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.bind.MissingRequestHeaderException.class})
    public ResponseEntity<Map<String,String>> malformed(Exception ignored) { return failure(Failure.invalidInput()); }
}