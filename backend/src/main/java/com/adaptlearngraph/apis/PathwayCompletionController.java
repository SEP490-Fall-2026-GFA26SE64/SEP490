package com.adaptlearngraph.apis;

import com.adaptlearngraph.services.*;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@RequestMapping("/api/v1/employee/pathways")
public final class PathwayCompletionController {
    private final PathwayCompletionService completion;
    public PathwayCompletionController(PathwayCompletionService completion){this.completion=completion;}
    @PostMapping("/{id}/complete-remaining")
    public ResponseEntity<?> advance(@PathVariable UUID id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(completion.advance(id));}
    @ExceptionHandler(AssessmentPolicyService.Failure.class)
    ResponseEntity<?> failure(AssessmentPolicyService.Failure f){return ResponseEntity.status(f.status).body(Map.of("code",f.code));}
    @ExceptionHandler(com.adaptlearngraph.exception.InitialPathwayFailure.class)
    ResponseEntity<?> pathwayFailure(com.adaptlearngraph.exception.InitialPathwayFailure f){return ResponseEntity.status(f.status()).body(Map.of("code",f.code()));}
    @ExceptionHandler(RoleBaselineFlow.Failure.class)
    ResponseEntity<?> selectionFailure(RoleBaselineFlow.Failure f){return ResponseEntity.status(f.status).body(Map.of("code",f.code));}
    @ExceptionHandler(ModuleAuthoringService.Failure.class)
    ResponseEntity<?> moduleFailure(ModuleAuthoringService.Failure f){return ResponseEntity.status(f.status()).body(Map.of("code","MODULE_COMPLETION_UNAVAILABLE"));}
}
