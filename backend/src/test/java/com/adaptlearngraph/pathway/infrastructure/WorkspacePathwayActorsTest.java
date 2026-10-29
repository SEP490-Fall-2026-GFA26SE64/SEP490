package com.adaptlearngraph.pathway.infrastructure;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts;
import com.adaptlearngraph.subscription.application.port.out.*;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.*;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Actual identity bridge; identity/entitlement owner ports remain unit doubles. */
class WorkspacePathwayActorsTest {
    final UUID org=new UUID(0,101), account=new UUID(0,103);
    final SubscriptionIdentity identity=mock(SubscriptionIdentity.class);
    final SubscriptionWorkspaceStore workspace=mock(SubscriptionWorkspaceStore.class);
    final WorkspacePathwayActors actors=new WorkspacePathwayActors(identity,workspace);
    Actor principal(Role role){return new Actor(account,org,true,true,Set.of(role),true);}
    @ParameterizedTest @EnumSource(value=Role.class,names={"EMPLOYEE","DOMAIN_EXPERT"})
    void R01_trustedSingleRoleAndOrganizationRequireLiveWorkspaceEntitlement(Role role) {
        var trusted=principal(role);when(identity.current()).thenReturn(new SubscriptionIdentity.Context(trusted,null));
        var result=actors.require();assertThat(result.organizationId()).isEqualTo(org);assertThat(result.accountId()).isEqualTo(account);
        assertThat(result.role().name()).isEqualTo(role.name());verify(workspace).require(eq(trusted),eq(org),eq(Action.WORKSPACE),any());
    }
    @ParameterizedTest @EnumSource(value=Role.class,names={"LD_MANAGER","ORGANIZATION_ADMINISTRATOR","PLATFORM_ADMINISTRATOR"})
    void R01_otherActorsDeniedWithoutPathwayAuthority(Role role) {
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(principal(role),null));
        assertThatThrownBy(actors::require).hasMessage("FORBIDDEN");verifyNoInteractions(workspace);
    }
    @Test void R01_missingTenantOrMultipleRolesCannotChooseAnEffectivePersona() {
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(new Actor(account,null,true,true,Set.of(Role.EMPLOYEE),true),null));
        assertThatThrownBy(actors::require).hasMessage("FORBIDDEN");
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(new Actor(account,org,true,true,Set.of(Role.EMPLOYEE,Role.DOMAIN_EXPERT),true),null));
        assertThatThrownBy(actors::require).hasMessage("FORBIDDEN");verifyNoInteractions(workspace);
    }
    @Test void R13_revokedMembershipOrEntitlementCannotUsePreviouslyTrustedSession() {
        var trusted=principal(Role.DOMAIN_EXPERT);when(identity.current()).thenReturn(new SubscriptionIdentity.Context(trusted,null));
        doThrow(new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN,"revoked")).when(workspace).require(eq(trusted),eq(org),eq(Action.WORKSPACE),any());
        assertThatThrownBy(actors::require).isInstanceOfSatisfying(InitialPathwayPorts.Failure.class,e->{assertThat(e.status()).isEqualTo(403);assertThat(e.code()).isEqualTo("UNAUTHORIZED_WORKSPACE");});
    }
}
