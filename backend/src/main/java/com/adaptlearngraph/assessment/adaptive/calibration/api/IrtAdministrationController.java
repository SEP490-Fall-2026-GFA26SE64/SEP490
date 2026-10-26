package com.adaptlearngraph.assessment.adaptive.calibration.api;

import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts;
import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.Authorization;
import com.adaptlearngraph.assessment.adaptive.calibration.application.PromotionPorts;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration;
import com.adaptlearngraph.assessment.adaptive.calibration.domain.Calibration.*;
import com.adaptlearngraph.assessment.adaptive.calibration.application.CalibrationPorts.Decoding;
import java.time.Instant;
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
@RequestMapping(value="/api/v1/admin/irt/banks/{bankId}/models/{modelId}",produces="application/json")
public final class IrtAdministrationController {
    public record RunRequest(UUID runId,Source source,String datasetRef,String datasetHash,String modelConfigurationHash,String modelParameterHash,String algorithmHash) {
        public RunRequest { Calibration.require(source!=null); }
    }
    public record PromoteRequest(UUID candidateId,String parameterHash,String modelConfigurationHash,String modelParameterHash,
                                  long expectedRevision,UUID expectedParameterSetId,String reason) {}
    public record RunView(UUID runId,Status status,UUID outputParameterSetId,Origin origin,Map<String,Object> diagnostics,
                          Instant createdAt,Instant startedAt,Instant completedAt) {}
    public record CandidateView(UUID parameterSetId,UUID modelVersionId,String source,String status,String parameterHash,
                                Result diagnostics,Instant createdAt,UUID activatedBy,Instant activatedAt) {}
    private final Authorization authorization;
    private final CalibrationPorts.UseCase calibration;
    private final PromotionPorts.UseCase promotion;
    private final Decoding json;
    public IrtAdministrationController(Authorization authorization,CalibrationPorts.UseCase calibration,PromotionPorts.UseCase promotion,Decoding json) {
        this.authorization=authorization; this.calibration=calibration; this.promotion=promotion; this.json=json;
    }
    @PostMapping(value="/calibration-runs",consumes="application/json")
    public ResponseEntity<RunView> run(@PathVariable UUID bankId,@PathVariable UUID modelId,jakarta.servlet.http.HttpServletRequest body) {
        Scope scope=scope(bankId,modelId,CalibrationPorts.Action.CALIBRATE); RunRequest r=decode(body,RunRequest.class);
        return ok(view(calibration.execute(new Request(r.runId(),scope,r.source(),r.datasetRef(),r.datasetHash(),r.modelConfigurationHash(),r.modelParameterHash(),r.algorithmHash()))));
    }
    @GetMapping("/calibration-runs/{runId}")
    public ResponseEntity<RunView> read(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID runId) {
        return ok(view(calibration.read(scope(bankId,modelId,CalibrationPorts.Action.READ),runId)));
    }
    @GetMapping("/candidates/{candidateId}")
    public ResponseEntity<CandidateView> candidate(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID candidateId) {
        Candidate c=calibration.candidate(scope(bankId,modelId,CalibrationPorts.Action.READ),candidateId);
        return ok(new CandidateView(c.id(),c.modelId(),c.source(),c.status(),c.parameterHash(),c.result(),c.createdAt(),c.activatedBy(),c.activatedAt()));
    }
    @PostMapping("/calibration-runs/{runId}/recover-expired")
    public ResponseEntity<RunView> recover(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID runId) {
        return ok(view(calibration.recoverExpired(scope(bankId,modelId,CalibrationPorts.Action.CALIBRATE),runId)));
    }
    @PostMapping("/calibration-runs/{runId}/cancel")
    public ResponseEntity<RunView> cancel(@PathVariable UUID bankId,@PathVariable UUID modelId,@PathVariable UUID runId) {
        return ok(view(calibration.cancel(scope(bankId,modelId,CalibrationPorts.Action.CALIBRATE),runId)));
    }
    @PostMapping(value="/promotions",consumes="application/json")
    public ResponseEntity<PromotionPorts.Selection> promote(@PathVariable UUID bankId,@PathVariable UUID modelId,
            @RequestHeader("Idempotency-Key") String key,jakarta.servlet.http.HttpServletRequest body) {
        Scope scope=scope(bankId,modelId,CalibrationPorts.Action.PROMOTE); PromoteRequest p=decode(body,PromoteRequest.class);
        return ok(promotion.promote(new PromotionPorts.Command(scope,p.candidateId(),p.parameterHash(),p.modelConfigurationHash(),p.modelParameterHash(),
                p.expectedRevision(),p.expectedParameterSetId(),key,p.reason())));
    }
    private Scope scope(UUID bank,UUID model,CalibrationPorts.Action action) {
        Scope scope=authorization.currentScope(bank,model);
        if (scope==null || !bank.equals(scope.bankId()) || !model.equals(scope.modelId())) throw new Failure(Code.FORBIDDEN);
        if (!scope.equals(authorization.require(scope,action).scope())) throw new Failure(Code.FORBIDDEN);
        return scope;
    }
    private <T> T decode(jakarta.servlet.http.HttpServletRequest request,Class<T> type) {
        Calibration.require(request.getContentLengthLong()<=65_536);
        try {
            byte[] body=request.getInputStream().readNBytes(65_537); Calibration.require(body.length<=65_536);
            String text=java.nio.charset.StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT).onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT)
                    .decode(java.nio.ByteBuffer.wrap(body)).toString();
            return json.read(text,type);
        } catch (java.io.IOException invalid) { throw new Failure(Code.INVALID_INPUT); }
    }
    private RunView view(Run run) {
        // Worker token/deadline are internal lease details, never exposed or accepted by an API.
        var diagnostics=new java.util.TreeMap<>(run.diagnostics()); diagnostics.remove("workerToken"); diagnostics.remove("expiresAt");
        return new RunView(run.id(),run.status(),run.outputId(),run.envelope().origin(),Map.copyOf(diagnostics),run.createdAt(),run.startedAt(),run.completedAt());
    }
    private <T> ResponseEntity<T> ok(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
    @ExceptionHandler(Failure.class)
    public ResponseEntity<Map<String,String>> failure(Failure failure) {
        HttpStatus status=switch(failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT,NOT_READY -> HttpStatus.CONFLICT;
            case DEPENDENCY_UNAVAILABLE,RESOURCE_LIMIT,TIMEOUT -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(Map.of("code",failure.code().name(),"message",failure.getMessage()));
    }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.bind.MissingRequestHeaderException.class})
    public ResponseEntity<Map<String,String>> malformed(Exception ignored) { return failure(new Failure(Code.INVALID_INPUT)); }
}
