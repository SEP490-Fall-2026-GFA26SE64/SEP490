package com.adaptlearngraph.assessment.adaptive.demo;

import com.adaptlearngraph.assessment.adaptive.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.assessment.adaptive.infrastructure.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.AdaptiveAttemptSnapshotResolver;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.infrastructure.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import java.util.*;
import org.neo4j.driver.Driver;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ002-12. Primary adapters explicitly route this demo; ordinary adapters are unchanged. */
@Configuration(proxyBeanMethods=false)
@Profile("local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix="assessment.baseline.local-demo",name="enabled",havingValue="true")
public class LocalDemoConfiguration {
    @Bean LocalDemoIdentity localDemoIdentity() { return new LocalDemoIdentity(); }
    @Bean LocalDemoProvisioning localDemoProvisioning(DataSource source, ObjectMapper json) { return new LocalDemoProvisioning(source,json); }
    @Bean @Primary AdaptiveBlueprintActorPort demoBlueprintActor(LocalDemoIdentity identity) {
        return new AdaptiveBlueprintActorPort() {
            public Optional<Actor> currentActor() { return Optional.of(new Actor(identity.actor(),LocalDemoIdentity.ORG,true,Set.of(identity.role()))); }
            public Set<String> authorizedOccupations(Actor actor) { return actor.isActiveLdManager() && actor.organizationId().equals(LocalDemoIdentity.ORG) ? Set.of(LocalDemoIdentity.OCC) : Set.of(); }
        };
    }
    @Bean @Primary AdaptiveBaselineCatalogPort demoCatalog(Driver driver,ObjectMapper json) {
        return new Neo4jAdaptiveBaselineCatalogAdapter(driver,json,LocalDemoIdentity.ORG,Set.of(LocalDemoIdentity.OCC),true);
    }
    @Bean @Primary AdaptiveTechnicalVersionPort demoTechnical(DataSource source) {
        var delegate = new JdbcAdaptiveTechnicalVersionStore(new NamedParameterJdbcTemplate(source));
        var pin = new VersionPins(LocalDemoIdentity.id("model-v1"),LocalDemoIdentity.id("mapping-v1"),LocalDemoIdentity.id("fitted-v1"));
        return new AdaptiveTechnicalVersionPort() {
            public Optional<TechnicalVersions> findPromoted(UUID model,UUID mapping) { return Optional.empty(); }
            public Optional<TechnicalVersions> findEffective(UUID org,UUID bank,UUID model,UUID mapping) {
                return org.equals(LocalDemoIdentity.ORG) && bank.equals(LocalDemoIdentity.BANK) && model.equals(pin.modelVersionId()) && mapping.equals(pin.masteryMappingVersionId()) ? delegate.findPinned(pin) : Optional.empty();
            }
            public Optional<TechnicalVersions> findPinned(VersionPins pins) { return delegate.findPinned(pins); }
            public List<ItemParameter> findParameters(VersionPins pins,Set<String> skills) { return delegate.findParameters(pins,skills); }
        };
    }
    @Bean @Primary AdaptiveBlueprintEligibilityPort demoEligibility(DataSource source,AdaptiveBaselineCatalogPort catalog,AdaptiveTechnicalVersionPort technical,ObjectMapper json,JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JdbcAdaptiveBlueprintEligibilityAdapter(new NamedParameterJdbcTemplate(source),catalog,technical,json,settings,true);
    }
    @Bean @Primary AdaptiveBlueprintPreviewPort demoPreview(DataSource source,ObjectMapper json) { return new JdbcAdaptiveBlueprintPreviewAdapter(new NamedParameterJdbcTemplate(source),json,LocalDemoIdentity.BANK,true); }
    @Bean @Primary AdaptiveAttemptContentPort demoContent(DataSource source) { return new JdbcAdaptiveAttemptContent(new NamedParameterJdbcTemplate(source),LocalDemoIdentity.BANK,true); }
    @Bean @Primary AdaptiveAttemptScoringPort demoScoring(DataSource source) { return new JdbcAdaptiveAttemptScoring(new NamedParameterJdbcTemplate(source),LocalDemoIdentity.BANK,true); }
    @Bean @Primary AdaptiveAttemptContextPort demoContext(DataSource source,LocalDemoIdentity identity,AdaptiveBlueprintStore store,AdaptiveBlueprintEligibilityPort eligibility,AdaptiveTechnicalVersionPort technical,AdaptiveBaselineCatalogPort catalog,
            AdaptiveSelectedRolePort selected,AdaptiveAttemptStore attempts,CurrentOccupationProfile profiles) {
        return new LocalAdaptiveAttemptContext(identity::actor,new NamedParameterJdbcTemplate(source),LocalDemoIdentity.ORG,Set.of(LocalDemoIdentity.OCC),catalog,new AdaptiveAttemptSnapshotResolver(store,eligibility,technical),selected,attempts,profiles::exists);
    }
}
