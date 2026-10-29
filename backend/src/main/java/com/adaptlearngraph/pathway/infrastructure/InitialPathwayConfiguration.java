package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.Codec;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.RoleReferences;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.ReleaseAuthority;
import com.adaptlearngraph.assessment.adaptive.demo.LocalDemoIdentity;
import com.adaptlearngraph.learning.infrastructure.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.sql.DataSource;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Default-off TMP-REQ001-07 wiring. Missing owners deny; no successful fake implementation. */
@Configuration(proxyBeanMethods=false)
@Profile("local-baseline-demo & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","pathway.local-auth-bypass.enabled","assessment.baseline.local-demo.enabled"},havingValue="true")
public class InitialPathwayConfiguration extends InitialPathwayComponents {
    @Bean @ConditionalOnProperty(name={"pathway.initial.local-assignment.enabled","pathway.initial.local-assignment.provision-expert-enabled"},havingValue="true")
    LocalExpertProvisioning initialExpertFixture(DataSource source,Environment env) {
        return new LocalExpertProvisioning(source,UUID.fromString(env.getRequiredProperty("pathway.local-auth-bypass.expert-account-id")));
    }
    @Bean Actors initialActors(LocalDemoIdentity identity,DataSource source) { return new LocalPathwayActors(identity,new NamedParameterJdbcTemplate(source)); }
}
