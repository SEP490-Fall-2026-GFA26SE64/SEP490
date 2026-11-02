package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.InitialCatalogPort;
import com.adaptlearngraph.repository.InitialPathwayPorts;
import com.adaptlearngraph.repository.InitialPathwayStore;
import com.adaptlearngraph.repository.InitialPlanningPorts;
import com.adaptlearngraph.repository.LocalPathwayActors;
import com.adaptlearngraph.repository.PathwayActorJpaRepository;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.repository.InitialPathwayStore.Codec;
import com.adaptlearngraph.repository.InitialPlanningPorts.*;
import com.adaptlearngraph.repository.InitialCatalogPort.RoleReferences;
import com.adaptlearngraph.repository.InitialCatalogPort.ReleaseAuthority;
import com.adaptlearngraph.constants.LocalDemoIdentity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Default-off TMP-REQ001-07 wiring. Missing owners deny; no successful fake implementation. */
@Configuration(proxyBeanMethods=false)
@Profile("local-baseline-demo & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","pathway.local-auth-bypass.enabled","assessment.baseline.local-demo.enabled"},havingValue="true")
@Import(PersistenceConfiguration.class)
public class InitialPathwayConfiguration extends InitialPathwayComponents {
    @Bean @ConditionalOnProperty(name={"pathway.initial.local-assignment.enabled","pathway.initial.local-assignment.provision-expert-enabled"},havingValue="true")
    LocalExpertProvisioning initialExpertFixture(com.adaptlearngraph.repository.DevelopmentSeedJpaRepository seeds,Environment env,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager transactionManager) {
        return new LocalExpertProvisioning(seeds,transactionManager,UUID.fromString(env.getRequiredProperty("pathway.local-auth-bypass.expert-account-id")));
    }
    @Bean Actors initialActors(LocalDemoIdentity identity,PathwayActorJpaRepository actors) { return new LocalPathwayActors(identity,actors); }
}
