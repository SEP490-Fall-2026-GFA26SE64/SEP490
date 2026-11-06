package com.adaptlearngraph.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionTemplate;

class PlatformWorkspaceDirectoryTest {
    private static final Instant NOW = Instant.parse("2026-11-04T00:00:00Z");
    private final OrganizationJpaRepository organizations = mock(OrganizationJpaRepository.class);
    private final OrganizationMembershipJpaRepository memberships = mock(OrganizationMembershipJpaRepository.class);
    private final SubscriptionJpaRepository subscriptions = mock(SubscriptionJpaRepository.class);
    private final SubscriptionRepositories data = mock(SubscriptionRepositories.class);

    private JpaSubscriptionWorkspaceStore store() {
        when(data.organizations()).thenReturn(organizations);
        when(data.memberships()).thenReturn(memberships);
        when(data.subscriptions()).thenReturn(subscriptions);
        return new JpaSubscriptionWorkspaceStore(data, mock(TransactionTemplate.class));
    }

    @Test
    void emptyDirectoryDoesNotQueryEmptyInLists() {
        when(organizations.withWorkspaces()).thenReturn(List.of());
        assertThat(store().workspaces(NOW)).isEmpty();
        verifyNoInteractions(memberships, subscriptions);
    }

    @Test
    void usesOneTimeBoundaryAndBatchedQueriesPreservingNullableNamesAndInactiveAdmins() {
        var ids = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        when(organizations.withWorkspaces()).thenReturn(ids.stream()
                .map(id -> new OrganizationJpaRepository.Listed(id, "Organization", "SUSPENDED", "READY")).toList());
        var admin = new OrganizationMembershipJpaRepository.Administrator(ids.getFirst(), UUID.randomUUID(),
                null, "admin@example.test", false, true);
        when(memberships.administrators(ids)).thenReturn(List.of(admin));
        when(subscriptions.directoryPeriods(ids)).thenReturn(List.of(
                new SubscriptionJpaRepository.DirectoryPeriod(ids.get(0), "Purchased plan", NOW, NOW.plusSeconds(60)),
                new SubscriptionJpaRepository.DirectoryPeriod(ids.get(1), "Expired plan", NOW.minusSeconds(60), NOW),
                new SubscriptionJpaRepository.DirectoryPeriod(ids.get(2), "Future plan", NOW.plusSeconds(60), NOW.plusSeconds(120))));

        var result = store().workspaces(NOW);

        assertThat(result).extracting(w -> w.subscription().status()).containsExactly("ACTIVE", "EXPIRED", "SCHEDULED", "NONE");
        assertThat(result.getFirst().status()).isEqualTo("SUSPENDED");
        assertThat(result.getFirst().subscription().current().name()).isEqualTo("Purchased plan");
        assertThat(result.getFirst().administrators()).containsExactly(
                new SubscriptionWorkspaceStore.WorkspaceAdministrator(admin.accountId(), null, admin.email(), false, true));
        assertThat(result.subList(1, 4)).allSatisfy(workspace -> {
            assertThat(workspace.subscription().current()).isNull();
            assertThat(workspace.administrators()).isEmpty();
        });
        verify(memberships).administrators(ids);
        verify(subscriptions).directoryPeriods(ids);
        verifyNoMoreInteractions(memberships, subscriptions);
    }
}
