package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.AdaptiveBlueprintService;
import com.adaptlearngraph.assessment.adaptive.api.AdaptiveBlueprintPayloads;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintActorPort.Actor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.lang.reflect.Type;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** TMP-REQ002-02/03/07. All callers share one explicit server-configured local actor; never production authentication. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled"}, havingValue = "true")
public class LocalAdaptiveBlueprintApiConfiguration {
    @Bean
    AdaptiveBlueprintActorPort adaptiveBlueprintActorPort(DataSource dataSource,
            @Value("${assessment.baseline.adaptive.local-actor-id:#{null}}") UUID actorId,
            JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        var jdbc = new NamedParameterJdbcTemplate(dataSource);
        AdaptiveBlueprintActorPort identity = () -> {
            if (actorId == null) return Optional.empty();
            try {
                var params = Map.of("actor", actorId);
                return jdbc.query("SELECT account_id,organization_id,active FROM platform.account WHERE account_id=:actor AND organization_id IS NOT NULL",
                        params, (rs, row) -> new Actor(rs.getObject("account_id", UUID.class), rs.getObject("organization_id", UUID.class),
                                rs.getBoolean("active"), new HashSet<>(jdbc.queryForList(
                                        "SELECT role_code FROM platform.account_role WHERE account_id=:actor", params, String.class)))).stream().findFirst();
            } catch (DataAccessException cause) {
                Failure failure = new Failure(Code.DEPENDENCY_UNAVAILABLE, "Actor context unavailable", List.of());
                failure.initCause(cause);
                throw failure;
            }
        };
        return new AdaptiveBlueprintActorPort() {
            @Override public Optional<Actor> currentActor() { return identity.currentActor(); }
            @Override public java.util.Set<String> authorizedOccupations(Actor actor) {
                return actor.isActiveLdManager() && settings.organizationId().equals(actor.organizationId())
                        ? settings.occupationIds() : java.util.Set.of();
            }
        };
    }

    @Bean
    AdaptiveBlueprintPreviewPort adaptiveBlueprintPreviewPort(DataSource dataSource, ObjectMapper mapper,
            JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JdbcAdaptiveBlueprintPreviewAdapter(new NamedParameterJdbcTemplate(dataSource), mapper, settings.questionBankId());
    }

    @Bean
    AdaptiveBlueprintUseCase adaptiveBlueprintUseCase(AdaptiveBlueprintActorPort actor, AdaptiveBlueprintStore store,
            AdaptiveBlueprintEligibilityPort eligibility, AdaptiveBlueprintPreviewPort items) {
        return new AdaptiveBlueprintService(actor, store, eligibility, items, Clock.systemUTC());
    }

    @Bean
    WebMvcConfigurer adaptiveBlueprintResponseJson(ObjectMapper mapper) {
        var responses = mapper.copy().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
        return new WebMvcConfigurer() {
            @Override public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
                // Only adaptive wire allowlists; do not change other owners' JSON or request decoding.
                converters.addFirst(new MappingJackson2HttpMessageConverter(responses) {
                    @Override public boolean canRead(Class<?> type, MediaType media) { return false; }
                    @Override public boolean canRead(Type type, Class<?> context, MediaType media) { return false; }
                    @Override public boolean canWrite(Class<?> type, MediaType media) {
                        return type.getEnclosingClass() == AdaptiveBlueprintPayloads.class && super.canWrite(type, media);
                    }
                });
            }
        };
    }

    @Bean
    @Order(0)
    SecurityFilterChain localAdaptiveBlueprintSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/v1/ld/adaptive-baseline-blueprints/**")
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/v1/ld/adaptive-baseline-blueprints/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/ld/adaptive-baseline-blueprints/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/ld/adaptive-baseline-blueprints/**").permitAll()
                        .anyRequest().denyAll())
                .csrf(csrf -> csrf.disable()).build();
    }
}
