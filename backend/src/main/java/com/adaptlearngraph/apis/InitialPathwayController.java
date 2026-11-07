package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.InitialPathwayDto.OutcomeResponse;
import com.adaptlearngraph.exception.InitialPathwayFailure;
import com.adaptlearngraph.services.InitialPathwayAdmission;
import com.adaptlearngraph.services.InitialPathwayApplicationService;
import com.adaptlearngraph.services.InitialPathwayReview;
import com.adaptlearngraph.services.InitialReviewOrder;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiEndpoints.INITIAL_PATHWAY)
@Profile("local-baseline-demo & !workspace-baseline & !prod")
@ConditionalOnProperty(name="pathway.initial.enabled",havingValue="true")
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression("${assessment.baseline.workspace.enabled:false} or (${pathway.local-auth-bypass.enabled:false} and ${assessment.baseline.local-demo.enabled:false})")
public final class InitialPathwayController {
    private final InitialPathwayApplicationService pathways;private final ObjectMapper json;
    public InitialPathwayController(InitialPathwayApplicationService pathways,ObjectMapper json) {
        this.pathways=pathways;this.json=json;
    }
    @GetMapping("/employee/role-gaps") ResponseEntity<?> gaps(@RequestParam String roleId,@RequestParam String levelId) { return ok(pathways.gaps(roleId,levelId)); }
    @PostMapping("/employee/initial-pathway-requests") ResponseEntity<?> confirm(@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(pathways.confirm(key,parse(body,InitialPathwayAdmission.Confirm.class)));
    }
    @GetMapping("/employee/initial-pathway-requests/{id}") ResponseEntity<?> request(@PathVariable UUID id) { return ok(pathways.request(id)); }
    @GetMapping("/employee/pathway") ResponseEntity<?> current() { return ok(pathways.current()); }
    @GetMapping("/employee/pathways/{id}") ResponseEntity<?> archived(@PathVariable UUID id) { return ok(pathways.archived(id)); }
    @GetMapping("/expert/initial-pathways") ResponseEntity<?> queue(@RequestParam(defaultValue="0")int offset,@RequestParam(defaultValue="20")int limit) { return ok(pathways.queue(offset,limit)); }
    @GetMapping("/expert/initial-pathways/{id}") ResponseEntity<?> detail(@PathVariable UUID id) { return ok(pathways.detail(id)); }
    @GetMapping("/expert/initial-pathways/{id}/validation") ResponseEntity<?> validation(@PathVariable UUID id) { return ok(pathways.validate(id)); }
    @PostMapping("/expert/initial-pathways/{id}/inclusions") ResponseEntity<?> include(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(pathways.edit(id,key,parse(body,InitialPathwayReview.Edit.class),true));
    }
    @PostMapping("/expert/initial-pathways/{id}/exclusions") ResponseEntity<?> exclude(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(pathways.edit(id,key,parse(body,InitialPathwayReview.Edit.class),false));
    }
    @PostMapping("/expert/initial-pathways/{id}/moves") ResponseEntity<?> move(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(pathways.move(id,key,parse(body,InitialPathwayReview.Move.class)));
    }
    @PostMapping("/expert/initial-pathways/{id}/removals") ResponseEntity<?> remove(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(pathways.remove(id,key,parse(body,InitialPathwayReview.Edit.class)));
    }
    @PostMapping("/expert/initial-pathways/{id}/confirmation") ResponseEntity<?> approve(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(pathways.approve(id,key,parse(body,InitialPathwayReview.Expected.class)));
    }
    private <T> T parse(String body,Class<T> type) {
        if(body.length()>16384)throw new InitialPathwayFailure(400,"INVALID_REQUEST");
        try { var value=json.readerFor(type).with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue(body);if(value==null)throw new InitialPathwayFailure(400,"INVALID_REQUEST");return type.cast(value); }
        catch(InitialPathwayFailure failure){throw failure;}catch(Exception invalid){throw new InitialPathwayFailure(400,"INVALID_REQUEST");}
    }
    private ResponseEntity<String> outcome(OutcomeResponse r) { return ResponseEntity.status(r.status()).cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_JSON).body(r.responseJson()); }
    private <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
    @ExceptionHandler(InitialPathwayFailure.class) ResponseEntity<?> failure(InitialPathwayFailure e) {
        return ResponseEntity.status(e.status()).cacheControl(CacheControl.noStore()).body(Map.of("code",e.code(),"retryable",e.retryable(),"correlationId",e.correlationId()));
    }
    @ExceptionHandler(InitialReviewOrder.Rejected.class) ResponseEntity<?> orderFailure(InitialReviewOrder.Rejected e) {
        return ResponseEntity.unprocessableEntity().cacheControl(CacheControl.noStore()).body(Map.of("code","PREREQUISITE_ORDER_VIOLATION","diagnostics",e.diagnostics()));
    }
    @ExceptionHandler(com.adaptlearngraph.services.RoleBaselineFlow.Failure.class)
    ResponseEntity<?> selectionFailure(com.adaptlearngraph.services.RoleBaselineFlow.Failure e) { return failure(new InitialPathwayFailure(e.status,e.code)); }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class})
    ResponseEntity<?> unavailable(Exception e) { return failure(new InitialPathwayFailure(503,"DEPENDENCY_UNAVAILABLE")); }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.bind.MissingRequestHeaderException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> invalid(Exception e) { return failure(new InitialPathwayFailure(400,"INVALID_REQUEST")); }
}
