package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.adaptlearngraph.repository.AdaptiveAttemptContentPort;
import com.adaptlearngraph.repository.AdaptiveAttemptContextPort;
import com.adaptlearngraph.repository.AdaptiveAttemptScoringPort;
import com.adaptlearngraph.repository.AdaptiveAttemptStore;
import com.adaptlearngraph.repository.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintActorPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintPreviewPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintStore;
import com.adaptlearngraph.repository.AdaptiveSelectedRolePort;
import com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.repository.CurrentJobPositionProfile;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptContent;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptScoring;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintEligibilityAdapter;
import com.adaptlearngraph.repository.JpaAdaptiveBlueprintPreviewAdapter;
import com.adaptlearngraph.repository.LocalAdaptiveAttemptContext;
import com.adaptlearngraph.repository.Neo4jAdaptiveBaselineCatalogAdapter;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.VersionPins;
import com.adaptlearngraph.services.AdaptiveAttemptSnapshotResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;

/** TMP-REQ002-12. Primary adapters explicitly route this demo; ordinary adapters are unchanged. */
@Configuration(proxyBeanMethods=false)
@Profile("local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix="assessment.baseline.local-demo",name="enabled",havingValue="true")
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class LocalDemoConfiguration {
    @Bean LocalDemoIdentity localDemoIdentity(org.springframework.core.env.Environment environment) {
        var expert=environment.getProperty("pathway.local-auth-bypass.expert-account-id",UUID.class);
        boolean enabled=environment.getProperty("pathway.local-auth-bypass.enabled",Boolean.class,false);
        return new LocalDemoIdentity(enabled && expert!=null ? Map.of("expert",expert) : Map.of());
    }
    @Bean LocalDemoProvisioning localDemoProvisioning(org.springframework.beans.factory.BeanFactory beans, ObjectMapper json,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        return new LocalDemoProvisioning(com.adaptlearngraph.repository.DevelopmentSeedRepositories.from(beans::getBean),json,transactionManager);
    }
    @Bean @Primary AdaptiveBlueprintActorPort demoBlueprintActor(LocalDemoIdentity identity) {
        return new AdaptiveBlueprintActorPort() {
            public Optional<Actor> currentActor() { return Optional.of(new Actor(identity.actor(),LocalDemoIdentity.ORG,true,Set.of(identity.role()))); }
            public Set<String> authorizedJobPositions(Actor actor) { return actor.isActiveLdManager() && actor.organizationId().equals(LocalDemoIdentity.ORG) ? Set.of(LocalDemoIdentity.OCC) : Set.of(); }
        };
    }
    @Bean @Primary AdaptiveBaselineCatalogPort demoCatalog(com.adaptlearngraph.repository.Neo4jCypher graph,ObjectMapper json) {
        return new Neo4jAdaptiveBaselineCatalogAdapter(graph,json,LocalDemoIdentity.ORG,Set.of(LocalDemoIdentity.OCC),true);
    }
    @Bean @Primary AdaptiveTechnicalVersionPort demoTechnical(DataSource source,com.adaptlearngraph.repository.IrtTechnicalVersionJpaRepository irtVersions) {
        var delegate = new com.adaptlearngraph.repository.JpaAdaptiveTechnicalVersionStore(irtVersions);
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
    @Bean @Primary AdaptiveBlueprintEligibilityPort demoEligibility(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions,AdaptiveBaselineCatalogPort catalog,AdaptiveTechnicalVersionPort technical,ObjectMapper json,JpaAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JpaAdaptiveBlueprintEligibilityAdapter(itemVersions,catalog,technical,json,settings,true);
    }
    @Bean @Primary AdaptiveBlueprintPreviewPort demoPreview(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions,ObjectMapper json) { return new JpaAdaptiveBlueprintPreviewAdapter(itemVersions,json,LocalDemoIdentity.BANK,true); }
    @Bean @Primary AdaptiveAttemptContentPort demoContent(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions) { return new JpaAdaptiveAttemptContent(itemVersions,LocalDemoIdentity.BANK,true); }
    @Bean @Primary AdaptiveAttemptScoringPort demoScoring(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions) { return new JpaAdaptiveAttemptScoring(itemVersions,LocalDemoIdentity.BANK,true); }
    @Bean @Primary AdaptiveAttemptContextPort demoContext(com.adaptlearngraph.repository.AdaptiveAttemptContextJpaRepository identities,LocalDemoIdentity identity,AdaptiveBlueprintStore store,AdaptiveBlueprintEligibilityPort eligibility,AdaptiveTechnicalVersionPort technical,AdaptiveBaselineCatalogPort catalog,
            AdaptiveSelectedRolePort selected,AdaptiveAttemptStore attempts,CurrentJobPositionProfile profiles) {
        return new LocalAdaptiveAttemptContext(identity::actor,identities,LocalDemoIdentity.ORG,Set.of(LocalDemoIdentity.OCC),catalog,new AdaptiveAttemptSnapshotResolver(store,eligibility,technical),selected,attempts,profiles::exists);
    }
}
