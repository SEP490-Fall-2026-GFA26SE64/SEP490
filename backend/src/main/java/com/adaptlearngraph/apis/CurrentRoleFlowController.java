package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.RoleBaselineFlow;
import com.adaptlearngraph.services.RoleBaselineFlow.*;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("((local-baseline-demo & !workspace-baseline) | (local & workspace-baseline & !local-baseline-demo)) & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnExpression("${assessment.baseline.local-demo.enabled:false} or ${assessment.baseline.workspace.enabled:false}")
@RequestMapping(ApiEndpoints.CURRENT_ROLE_FLOW)
public final class CurrentRoleFlowController {
    private final RoleBaselineFlow flow;private final ObjectMapper json;
    public CurrentRoleFlowController(RoleBaselineFlow flow,ObjectMapper json){this.flow=flow;this.json=json;}
    @GetMapping("/target-roles") ResponseEntity<List<Role>> roles(@RequestParam(required=false)String search){return ok(flow.roles(search));}
    @GetMapping("/target-roles/{id}") ResponseEntity<Role> role(@PathVariable String id){return ok(flow.roles(null).stream().filter(r->r.id().equals(id)).findFirst().orElseThrow(()->new Failure(404,"ROLE_NOT_AVAILABLE")));}
    @GetMapping({"/target-role-selection","/target-role-selection/next-step"}) ResponseEntity<View> view(){return ok(flow.view());}
    @PutMapping("/target-role-selection") ResponseEntity<Selection> choose(@RequestHeader("Idempotency-Key")String key,@RequestBody String body){
        if(body.length()>4096)throw new Failure(400,"INVALID_REQUEST");
        Choose command;
        try{command=json.readerFor(Choose.class).with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue(body);}
        catch(Exception e){throw new Failure(400,"INVALID_REQUEST");}
        if(command==null)throw new Failure(400,"INVALID_REQUEST");
        return ok(flow.choose(command.roleId(),command.levelId(),command.expectedCurrentSelectionId(),key));
    }
    record Choose(String roleId,String levelId,UUID expectedCurrentSelectionId){}
    @GetMapping("/target-role-selection/mastery") ResponseEntity<List<MasteryProfile>> mastery(){return ok(flow.mastery());}
    @ExceptionHandler(Failure.class) ResponseEntity<Map<String,String>> failure(Failure e){return ResponseEntity.status(e.status).cacheControl(CacheControl.noStore()).body(Map.of("code",e.code));}
    @ExceptionHandler(com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure.class)
    ResponseEntity<Map<String,String>> actorFailure(com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure e){
        return failure(new Failure(switch(e.code()){case UNAUTHENTICATED->401;case FORBIDDEN->403;default->503;},e.code().name()));
    }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class})
    ResponseEntity<Map<String,String>> unavailable(Exception e){
        e.printStackTrace();
        return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE"));
    }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.bind.MissingRequestHeaderException.class})
    ResponseEntity<Map<String,String>> invalid(Exception e){return failure(new Failure(400,"INVALID_REQUEST"));}
    private <T>ResponseEntity<T> ok(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
}
