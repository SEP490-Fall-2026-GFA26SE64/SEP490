package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.RuleKnowledgeProfileService;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@RequestMapping(ApiEndpoints.CURRENT_ROLE_FLOW+"/knowledge-profile")
public final class RuleKnowledgeProfileController {
    private final RuleKnowledgeProfileService profiles;
    public RuleKnowledgeProfileController(RuleKnowledgeProfileService profiles){this.profiles=profiles;}
    @GetMapping public ResponseEntity<RuleKnowledgeProfileService.Page> read(@RequestParam(defaultValue="ALL") String kind,@RequestParam(defaultValue="0") int page) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.read(kind,page));
    }
    @ExceptionHandler(Failure.class) ResponseEntity<Map<String,String>> failure(Failure e){return ResponseEntity.status(e.status).cacheControl(CacheControl.noStore()).body(Map.of("code",e.code));}
    @ExceptionHandler(com.adaptlearngraph.services.RoleBaselineFlow.Failure.class)
    ResponseEntity<Map<String,String>> identity(com.adaptlearngraph.services.RoleBaselineFlow.Failure e){return failure(new Failure(e.status,e.code));}
    @ExceptionHandler(com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure.class)
    ResponseEntity<Map<String,String>> actor(com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure e){return failure(new Failure(switch(e.code()){case UNAUTHENTICATED->401;case FORBIDDEN->403;default->503;},e.code().name()));}
    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    ResponseEntity<Map<String,String>> unavailable(Exception e){return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE"));}
}
