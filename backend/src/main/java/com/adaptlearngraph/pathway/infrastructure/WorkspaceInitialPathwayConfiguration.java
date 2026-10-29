package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.Actors;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;

/** Real workspace identity only. Local persona configuration is mutually excluded. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
public class WorkspaceInitialPathwayConfiguration extends InitialPathwayComponents {
    @Bean Actors workspacePathwayActors(SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces) {
        return new WorkspacePathwayActors(identity,workspaces);
    }
}
