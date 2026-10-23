package com.adaptlearngraph.learning.api;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
/** RB04/16/17 MM02: current API envelope plus actual profile/property registration gates. */
class CurrentRoleFlowControllerTest {
 RoleBaselineFlow flow;MockMvc mvc;
 @BeforeEach void setup(){flow=mock(RoleBaselineFlow.class);mvc=MockMvcBuilders.standaloneSetup(new CurrentRoleFlowController(flow,new ObjectMapper().findAndRegisterModules())).build();}
 @Test void mm01OwnEmptyProfilesAreNoStore() throws Exception {
  when(flow.mastery()).thenReturn(List.of());
  mvc.perform(get("/api/v1/employee/target-role-selection/mastery")).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store")).andExpect(content().json("[]"));
  verify(flow).mastery();verifyNoMoreInteractions(flow);
 }
 @Test void mm02UnauthorizedAndUnavailableAreNotEmptySuccess() throws Exception {
  when(flow.mastery()).thenThrow(new RoleBaselineFlow.Failure(403,"FORBIDDEN"));
  mvc.perform(get("/api/v1/employee/target-role-selection/mastery")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN")).andExpect(header().string("Cache-Control","no-store"));
  doThrow(new IllegalStateException("private database detail")).when(flow).mastery();
  mvc.perform(get("/api/v1/employee/target-role-selection/mastery")).andExpect(status().isServiceUnavailable()).andExpect(content().json("{\"code\":\"DEPENDENCY_UNAVAILABLE\"}"));
 }
 @ParameterizedTest @ValueSource(strings={"{\"roleId\":\"role-a\",\"organizationId\":\"injected\"}","{\"roleId\":\"role-a\",\"learnerId\":\"injected\"}","null","{"})
 void rb16RejectsIdentityInjectionAndMalformedCommands(String body) throws Exception {
  mvc.perform(put("/api/v1/employee/target-role-selection").header("Idempotency-Key","test").contentType("application/json").content(body)).andExpect(status().isBadRequest());
  verifyNoInteractions(flow);
 }
 @Test void rb16NoClientIdentityInValidCommand() throws Exception {
  when(flow.choose("role-a",null,"key")).thenReturn(null);
  mvc.perform(put("/api/v1/employee/target-role-selection").header("Idempotency-Key","key").contentType("application/json").content("{\"roleId\":\"role-a\",\"expectedCurrentSelectionId\":null}")).andExpect(status().isOk());
  verify(flow).choose("role-a",null,"key");
 }
 @ParameterizedTest @ValueSource(strings={"","prod","local-baseline-demo,prod"})
 void rb16GateOffAndProdNeverRegisterController(String profiles) {
  new WebApplicationContextRunner().withUserConfiguration(CurrentRoleFlowController.class)
   .withBean(RoleBaselineFlow.class,()->flow).withBean(ObjectMapper.class,ObjectMapper::new)
   .withPropertyValues("spring.profiles.active="+profiles,"assessment.baseline.local-demo.enabled=true")
   .run(c->assertThat(c).doesNotHaveBean(CurrentRoleFlowController.class));
 }
 @Test void rb16PropertyGateRequiredAndEnabledLocalRegisters() {
  new WebApplicationContextRunner().withUserConfiguration(CurrentRoleFlowController.class)
   .withBean(RoleBaselineFlow.class,()->flow).withBean(ObjectMapper.class,ObjectMapper::new)
   .withPropertyValues("spring.profiles.active=local-baseline-demo","assessment.baseline.local-demo.enabled=false")
   .run(c->assertThat(c).doesNotHaveBean(CurrentRoleFlowController.class));
  new WebApplicationContextRunner().withUserConfiguration(CurrentRoleFlowController.class)
   .withBean(RoleBaselineFlow.class,()->flow).withBean(ObjectMapper.class,ObjectMapper::new)
   .withPropertyValues("spring.profiles.active=local-baseline-demo","assessment.baseline.local-demo.enabled=true")
   .run(c->assertThat(c).hasSingleBean(CurrentRoleFlowController.class));
 }
}
