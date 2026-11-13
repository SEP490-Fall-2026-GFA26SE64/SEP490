package com.adaptlearngraph.apis;

import com.adaptlearngraph.services.KnowledgeJourneyService;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@RequestMapping(com.adaptlearngraph.endpoints.ApiEndpoints.CURRENT_ROLE_FLOW+"/knowledge-profile/journey")
public final class KnowledgeJourneyController {
    private final KnowledgeJourneyService service;
    public KnowledgeJourneyController(KnowledgeJourneyService service){this.service=service;}
    @GetMapping public ResponseEntity<KnowledgeJourneyService.Page> read(@RequestParam(defaultValue="0") int page) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.read(page));
    }
    @ExceptionHandler(Failure.class) ResponseEntity<Map<String,String>> failure(Failure e){return ResponseEntity.status(e.status).cacheControl(CacheControl.noStore()).body(Map.of("code",e.code));}
    @ExceptionHandler(com.adaptlearngraph.services.RoleBaselineFlow.Failure.class)
    ResponseEntity<Map<String,String>> actor(com.adaptlearngraph.services.RoleBaselineFlow.Failure e){return failure(new Failure(e.status,e.code));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class})
    ResponseEntity<Map<String,String>> unavailable(Exception e){return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE"));}
}
