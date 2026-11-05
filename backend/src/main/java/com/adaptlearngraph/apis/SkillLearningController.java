package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.SkillLearningDto.*;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.SkillLearningApplicationService;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController @Profile("local") @RequestMapping(ApiEndpoints.LEARNING_CONTENT+"/skills")
public class SkillLearningController {
    private final SkillLearningApplicationService learning;
    public SkillLearningController(SkillLearningApplicationService learning) {this.learning=learning;}
    @GetMapping("/{skillId}/assessment-eligibility")
    public EligibilityResponse eligibility(@PathVariable String skillId) {
        return learning.eligibility(skillId);
    }
    @GetMapping("/{skillId}/modules")
    public List<ModuleResponse> modules(@PathVariable String skillId) {
        return learning.modules(skillId);
    }
    @ExceptionHandler(com.adaptlearngraph.services.ModuleAuthoringService.Failure.class)
    public org.springframework.http.ResponseEntity<java.util.Map<String,String>> failure(com.adaptlearngraph.services.ModuleAuthoringService.Failure error) {
        return org.springframework.http.ResponseEntity.status(error.status()).body(java.util.Map.of("message",error.getMessage()));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public org.springframework.http.ResponseEntity<java.util.Map<String,String>> invalid(IllegalArgumentException error) {
        return org.springframework.http.ResponseEntity.badRequest().body(java.util.Map.of("message",error.getMessage()));
    }
    @PostMapping("/{skillId}/modules/{moduleId}/learning") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void start(@PathVariable String skillId,@PathVariable String moduleId) {learning.start(skillId,moduleId);}
}
