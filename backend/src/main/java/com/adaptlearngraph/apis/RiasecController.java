package com.adaptlearngraph.apis;

import com.adaptlearngraph.entities.domain.RiasecRules.Failure;
import com.adaptlearngraph.services.*;
import com.adaptlearngraph.services.RiasecService.Edit;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnProperty(name="riasec.enabled",havingValue="true")
@RequestMapping("/api/v1/employee/riasec")
public final class RiasecController {
    private final RiasecService service;private final ObjectMapper json;
    public RiasecController(RiasecService service,ObjectMapper json){this.service=service;this.json=json;}
    @GetMapping public ResponseEntity<?> view(){return ok(service.view());}
    record Start(UUID editorId) {}
    @PostMapping("/draft") public ResponseEntity<?> start(@RequestBody String body){return ok(service.start(decode(body,Start.class).editorId()));}
    @PutMapping("/draft") public ResponseEntity<?> save(@RequestBody String body){return ok(service.save(decode(body,Edit.class)));}
    @PostMapping("/draft/takeover") public ResponseEntity<?> claim(@RequestBody String body){return ok(service.claim(decode(body,Edit.class),true));}
    @PostMapping("/submit") public ResponseEntity<?> submit(@RequestBody String body){return ok(Map.of("id",service.submit(decode(body,Edit.class))));}
    @DeleteMapping("/results/{id}") public ResponseEntity<?> delete(@PathVariable UUID id){service.delete(id);return ok(Map.of());}
    @DeleteMapping("/results/{id}/permanent") public ResponseEntity<?> purge(@PathVariable UUID id){service.purge(id);return ok(Map.of());}
    @PostMapping("/results/{id}/restore") public ResponseEntity<?> restore(@PathVariable UUID id){service.restore(id);return ok(Map.of());}
    @PostMapping("/results/{id}/retry") public ResponseEntity<?> retry(@PathVariable UUID id){service.retry(id);return ok(Map.of());}
    private <T>T decode(String body,Class<T> type){
        if(body==null || body.length()>12000)throw new Failure(400,"INVALID_REQUEST");
        try {
            var tree=json.readTree(body);if(tree==null || !tree.isObject())throw new IllegalArgumentException();
            if(tree.has("revision") && (!tree.path("revision").isIntegralNumber() || !tree.path("revision").canConvertToLong() || tree.path("revision").longValue()<0))throw new IllegalArgumentException();
            if(tree.has("answers") && !tree.path("answers").isNull()) {
                if(!tree.path("answers").isObject())throw new IllegalArgumentException();
                for(var v:tree.path("answers"))if(!v.isIntegralNumber() || !v.canConvertToInt())throw new IllegalArgumentException();
            }
            return json.readerFor(type).with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).without(DeserializationFeature.ACCEPT_FLOAT_AS_INT).readValue(body);
        }catch(Exception invalid){throw new Failure(400,"INVALID_REQUEST");}
    }
    @ExceptionHandler(Failure.class) public ResponseEntity<?> failure(Failure e){return ResponseEntity.status(e.status).cacheControl(CacheControl.noStore()).body(Map.of("code",e.code));}
    @ExceptionHandler(RoleBaselineFlow.Failure.class) public ResponseEntity<?> actor(RoleBaselineFlow.Failure e){return failure(new Failure(e.status,e.code));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,org.springframework.transaction.TransactionException.class}) public ResponseEntity<?> unavailable(Exception e){return failure(new Failure(503,"RIASEC_UNAVAILABLE"));}
    private static <T>ResponseEntity<T> ok(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
}
