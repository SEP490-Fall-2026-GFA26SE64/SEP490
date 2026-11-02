package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.AdaptiveBlueprintActorPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintPreviewPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintStore;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintEligibilityAdapter;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintPreviewAdapter;
import com.adaptlearngraph.repository.LocalBlueprintActorJpaRepository;
import com.adaptlearngraph.services.AdaptiveBlueprintService;
import com.adaptlearngraph.responseDto.AdaptiveBlueprintPayloads;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.repository.AdaptiveBlueprintActorPort.Actor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.lang.reflect.Type;
import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** TMP-REQ002-02/03/07. All callers share one explicit server-configured local actor; never production authentication. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled"}, havingValue = "true")
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class LocalAdaptiveBlueprintApiConfiguration {
    @Bean
    AdaptiveBlueprintActorPort adaptiveBlueprintActorPort(LocalBlueprintActorJpaRepository accounts,
            @Value("${assessment.baseline.adaptive.local-actor-id:#{null}}") UUID actorId,
            JpaAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        AdaptiveBlueprintActorPort identity = () -> {
            if (actorId == null) return Optional.empty();
            try {
                return accounts.account(actorId).stream().map(account -> new Actor(account.accountId(), account.organizationId(),
                        Boolean.TRUE.equals(account.active()), new HashSet<>(accounts.roles(actorId)))).findFirst();
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
    AdaptiveBlueprintPreviewPort adaptiveBlueprintPreviewPort(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, ObjectMapper mapper,
            JpaAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JpaAdaptiveBlueprintPreviewAdapter(itemVersions, mapper, settings.questionBankId());
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
