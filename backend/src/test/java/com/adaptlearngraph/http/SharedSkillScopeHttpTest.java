package com.adaptlearngraph.http;
import com.adaptlearngraph.services.RuleAssessmentAttemptService;
import com.adaptlearngraph.services.AssessmentPolicyService;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.adaptlearngraph.apis.RuleAssessmentController;
import com.adaptlearngraph.repository.OrganizationMembershipJpaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SharedSkillScopeHttpTest {
    final RuleAssessmentAttemptService service=mock(RuleAssessmentAttemptService.class);
    final org.springframework.test.web.servlet.MockMvc http=MockMvcBuilders.standaloneSetup(new RuleAssessmentController(service,new ObjectMapper(),mock(OrganizationMembershipJpaRepository.class))).build();
    @Test void requiresCompleteScopeAndRejectsMixedLocator() throws Exception {
        http.perform(get("/api/v1/employee/baseline-attempts/skill-scope/history").param("skillId","s")).andExpect(status().isBadRequest());
        http.perform(get("/api/v1/employee/baseline-attempts/skill-scope/history").param("skillId","s").param("knowledgeLevel","FOUNDATION").param("skillVersion","v1").param("moduleId","m")).andExpect(status().isBadRequest());
        verify(service,never()).skillHistory(any(),any(),any(),anyInt(),anyInt());
    }
    @Test void doesNotAcceptAnActorOrOrganizationFromTheRequest() throws Exception {
        http.perform(get("/api/v1/employee/baseline-attempts/skill-scope/history").param("skillId","s").param("knowledgeLevel","FOUNDATION").param("skillVersion","v1").param("organizationId","foreign").param("learnerId","foreign")).andExpect(status().isOk());
        verify(service).authorize();verify(service).skillHistory("s","FOUNDATION","v1",0,20);
    }
    @Test void unauthorizedAndWrongRoleActorsAreDeniedBeforeAnyScopeRead() throws Exception {
        doThrow(new AssessmentPolicyService.Failure(401,"UNAUTHENTICATED")).when(service).authorize();
        http.perform(get("/api/v1/employee/baseline-attempts/skill-scope/history").param("moduleId","m").param("moduleRevision","1")).andExpect(status().isUnauthorized());
        doThrow(new AssessmentPolicyService.Failure(403,"FORBIDDEN")).when(service).authorize();
        http.perform(get("/api/v1/employee/baseline-attempts/skill-scope/history").param("moduleId","m").param("moduleRevision","1")).andExpect(status().isForbidden());
        verify(service,never()).moduleSkillHistory(any(),anyInt(),anyInt(),anyInt(),any());
    }
}
