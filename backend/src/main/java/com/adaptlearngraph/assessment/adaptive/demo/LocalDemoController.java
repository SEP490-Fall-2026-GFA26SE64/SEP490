package com.adaptlearngraph.assessment.adaptive.demo;

import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.core.annotation.Order;

@RestController
@Profile("local-baseline-demo & !prod")
@ConditionalOnProperty(prefix="assessment.baseline.local-demo",name="enabled",havingValue="true")
public class LocalDemoController {
    private final LocalDemoIdentity identity;
    public LocalDemoController(LocalDemoIdentity identity) { this.identity=identity; }
    @GetMapping("/api/v1/local-baseline-demo/session")
    ResponseEntity<?> session() { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("persona",identity.selected(),"personas",identity.personas().stream().sorted().toList(),"actorId",identity.actor(),"role",identity.role(),"origin","SYNTHETIC","occupationId",LocalDemoIdentity.OCC,"organizationId",LocalDemoIdentity.ORG)); }
    public record Switch(String persona) {}
    @PostMapping("/api/v1/local-baseline-demo/session")
    ResponseEntity<?> change(@RequestBody Switch input) {
        if (input.persona()==null || !identity.personas().contains(input.persona())) return ResponseEntity.badRequest().build();
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE,ResponseCookie.from("baseline_demo_persona",input.persona()).httpOnly(true).sameSite("Strict").path("/api").build().toString()).build();
    }
    @GetMapping("/api/v1/ld/baseline-blueprint-catalog/occupations")
    ResponseEntity<?> occupations() { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(identity.role().equals("LD_MANAGER") ? List.of(Map.of("id",LocalDemoIdentity.OCC,"name","Information Security Analysts")) : List.of()); }
    @Configuration(proxyBeanMethods=false)
    @Profile("local-baseline-demo & !prod")
    @ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
    @ConditionalOnProperty(prefix="assessment.baseline.local-demo",name="enabled",havingValue="true")
    static class Security {
        @Bean @Order(-1) SecurityFilterChain demoSessionSecurity(HttpSecurity http) throws Exception {
            return http.securityMatcher("/api/v1/local-baseline-demo/**","/api/v1/ld/baseline-blueprint-catalog/occupations")
                .authorizeHttpRequests(a->a.anyRequest().permitAll()).csrf(c->c.disable()).build();
        }
    }
}
