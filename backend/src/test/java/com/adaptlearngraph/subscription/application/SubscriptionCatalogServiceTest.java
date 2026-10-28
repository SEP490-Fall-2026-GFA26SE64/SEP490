package com.adaptlearngraph.subscription.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionPlanStore;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SubscriptionCatalogServiceTest {
    private final SubscriptionPlanStore store = mock(SubscriptionPlanStore.class);
    private final SubscriptionIdentity identity = mock(SubscriptionIdentity.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-22T12:00:00Z"), ZoneOffset.UTC);
    private final SubscriptionCatalogService service = new SubscriptionCatalogService(store, identity, clock);
    private final PlanTerms terms = new PlanTerms("Starter", "Description", 4_900_000, "VND", 1, 20);

    @Test
    void passwordAuthenticatedPlatformAdministratorCanEdit() {
        UUID account = UUID.randomUUID();
        UUID plan = UUID.randomUUID();
        UUID version = UUID.randomUUID();
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                new Actor(account, null, true, false, Set.of(Role.PLATFORM_ADMINISTRATOR), false), null));
        service.update(plan, version, terms);
        verify(store).update(plan, version, terms, account, clock.instant());
    }

    @Test
    void organizationRolesCannotEditPlatformPlans() {
        for (var role : Role.values()) {
            if (role == Role.PLATFORM_ADMINISTRATOR) continue;
            when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                    new Actor(UUID.randomUUID(), UUID.randomUUID(), true, true, Set.of(role), true), null));
            var failure = assertThrows(SubscriptionFailure.class,
                    () -> service.update(UUID.randomUUID(), UUID.randomUUID(), terms));
            assertEquals(SubscriptionFailure.Code.FORBIDDEN, failure.code());
        }
        verifyNoInteractions(store);
    }

    @Test
    void completedRegistrantCanReadWithoutWorkspaceButEmployeeCannot() {
        when(store.currentPlans()).thenReturn(List.of());
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                new Actor(UUID.randomUUID(), null, true, false, Set.of(), true), UUID.randomUUID()));
        assertTrue(service.plans().isEmpty());
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                new Actor(UUID.randomUUID(), UUID.randomUUID(), true, true, Set.of(Role.EMPLOYEE), false), null));
        assertEquals(SubscriptionFailure.Code.FORBIDDEN,
                assertThrows(SubscriptionFailure.class, service::plans).code());
        verify(store, times(1)).currentPlans();
    }

    @Test
    void absentOrInactiveIdentityDoesNotReachPersistence() {
        assertEquals(SubscriptionFailure.Code.UNAUTHENTICATED,
                assertThrows(SubscriptionFailure.class, service::plans).code());
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                new Actor(UUID.randomUUID(), null, false, false, Set.of(Role.PLATFORM_ADMINISTRATOR), true), null));
        assertEquals(SubscriptionFailure.Code.UNAUTHENTICATED,
                assertThrows(SubscriptionFailure.class, () -> service.update(UUID.randomUUID(), UUID.randomUUID(), terms)).code());
        verifyNoInteractions(store);
    }

    @Test
    void organizationPlanRouteRejectsAnotherOrganizationAndPlatformOnlyIdentity() {
        UUID organization = UUID.randomUUID();
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                new Actor(UUID.randomUUID(), organization, true, true, Set.of(Role.ORGANIZATION_ADMINISTRATOR), true), null));
        service.organizationPlans(organization);
        assertEquals(SubscriptionFailure.Code.FORBIDDEN,
                assertThrows(SubscriptionFailure.class, () -> service.organizationPlans(UUID.randomUUID())).code());
        assertEquals(SubscriptionFailure.Code.FORBIDDEN,
                assertThrows(SubscriptionFailure.class, service::administrativePlans).code());
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                new Actor(UUID.randomUUID(), null, true, false, Set.of(Role.PLATFORM_ADMINISTRATOR), true), null));
        assertEquals(SubscriptionFailure.Code.FORBIDDEN,
                assertThrows(SubscriptionFailure.class, () -> service.organizationPlans(organization)).code());
        verify(store, times(1)).currentPlans();
    }
}
