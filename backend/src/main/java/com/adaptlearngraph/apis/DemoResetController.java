package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.DemoResetResultDto;
import com.adaptlearngraph.services.DemoResetService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public demo recycling endpoint, triggered by the /reset page. */
@RestController
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class DemoResetController {
    public static final String PATH = "/api/v1/demo/reset";

    private final DemoResetService service;

    public DemoResetController(DemoResetService service) {
        this.service = service;
    }

    @PostMapping(PATH)
    ResponseEntity<DemoResetResultDto> reset(@org.springframework.web.bind.annotation.RequestHeader(value="Idempotency-Key",required=false) String commandKey) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.reset(commandKey==null?java.util.UUID.randomUUID().toString():commandKey));
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    static class Security {
        @Bean @Order(-2) SecurityFilterChain demoResetSecurity(HttpSecurity http) throws Exception {
            return http.securityMatcher(PATH,"/api/v1/demo/checkpoint/**").authorizeHttpRequests(a -> a.anyRequest().permitAll())
                    .csrf(c -> c.disable()).build();
        }
    }
}
