package com.adaptlearngraph.assessment.adaptive.demo;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** RB16/DEMO-01: server allowlist/cookie and production gates; no database or learner writes. */
class LocalDemoSessionTest {
    @Configuration(proxyBeanMethods=false) @EnableWebSecurity @EnableWebMvc
    static class TestSecurity {}
    final LocalDemoIdentity identity = new LocalDemoIdentity();
    final MockMvc mvc = MockMvcBuilders.standaloneSetup(new LocalDemoController(identity)).build();
    @AfterEach void clearRequest() { RequestContextHolder.resetRequestAttributes(); }

    @ParameterizedTest @ValueSource(strings={"ld","employee-a","employee-b","employee-c","admin"})
    void rb16AllowlistedSessionSetsHttpOnlyScopedCookie(String persona) throws Exception {
        mvc.perform(post("/api/v1/local-baseline-demo/session").contentType("application/json")
            .content("{\"persona\":\""+persona+"\"}"))
            .andExpect(status().isNoContent())
            .andExpect(header().string("Set-Cookie", "baseline_demo_persona="+persona+"; Path=/api; HttpOnly; SameSite=Strict"));
    }
    @ParameterizedTest @ValueSource(strings={"{\"persona\":\"employee-foreign\"}","{\"persona\":null}"})
    void rb16UnknownOrNullPersonaCannotSetCookie(String body) throws Exception {
        mvc.perform(post("/api/v1/local-baseline-demo/session").contentType("application/json").content(body))
            .andExpect(status().isBadRequest()).andExpect(header().doesNotExist("Set-Cookie"));
    }
    @Test void rb16UrlAndHeadersCannotOverrideServerIdentity() {
        var request = new MockHttpServletRequest("GET", "/employee/upskilling");
        request.addParameter("persona", "employee-a"); request.addParameter("organizationId", "foreign");
        request.addHeader("X-Actor", "employee-a");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        assertThat(identity.selected()).isEqualTo("ld"); assertThat(identity.role()).isEqualTo("LD_MANAGER");
        request.setCookies(new Cookie("baseline_demo_persona", "employee-a"));
        assertThat(identity.actor()).isEqualTo(LocalDemoIdentity.id("employee-a"));
        assertThat(identity.role()).isEqualTo("EMPLOYEE");
        request.setCookies(new Cookie("baseline_demo_persona", "foreign"));
        assertThatThrownBy(identity::actor).isInstanceOf(IllegalArgumentException.class);
    }
    @ParameterizedTest @ValueSource(strings={"", "prod", "local-baseline-demo,prod"})
    void rb16SessionEndpointAbsentOutsideExplicitNonProductionProfile(String profiles) {
        new WebApplicationContextRunner().withUserConfiguration(LocalDemoController.class, TestSecurity.class)
            .withBean(LocalDemoIdentity.class, () -> identity)
            .withPropertyValues("spring.profiles.active="+profiles,"assessment.baseline.local-demo.enabled=true")
            .run(context -> assertThat(context).doesNotHaveBean(LocalDemoController.class));
    }
    @Test void rb16SessionRequiresBothLocalProfileAndEnabledProperty() {
        for (String enabled : new String[]{"false", "true"}) {
            new WebApplicationContextRunner().withUserConfiguration(LocalDemoController.class, TestSecurity.class)
                .withBean(LocalDemoIdentity.class, () -> identity)
                .withPropertyValues("spring.profiles.active=local-baseline-demo","assessment.baseline.local-demo.enabled="+enabled)
                .run(context -> { if (enabled.equals("true")) { assertThat(context).hasSingleBean(LocalDemoController.class); assertThat(context).hasBean("demoSessionSecurity"); }
                    else { assertThat(context).doesNotHaveBean(LocalDemoController.class); assertThat(context).doesNotHaveBean("demoSessionSecurity"); } });
        }
    }
}
