package com.adaptlearngraph.learning.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.learning.application.TargetRoleSelectionException.Code;
import com.adaptlearngraph.learning.application.port.in.ChooseTargetRoleCommand;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionResult.Disposition;
import com.adaptlearngraph.learning.application.port.out.AssessmentActivityGuardPort;
import com.adaptlearngraph.learning.application.port.out.PathwayArchivePort;
import com.adaptlearngraph.learning.application.port.out.SelectionTransactionPort;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort;
import com.adaptlearngraph.learning.application.port.out.TargetRoleSelectionCatalogPort.SelectableTargetRole;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionActorPort.SelectionActor;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort.EventType;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionEventPort.TargetSelectionEvent;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort;
import com.adaptlearngraph.learning.application.port.out.TargetSelectionStorePort.RequestStatus;
import com.adaptlearngraph.learning.domain.TargetRoleSelection;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.CareerTrack;
import com.adaptlearngraph.learning.domain.TargetRoleSnapshot.Seniority;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

/** Application-policy tests. All adapters below are in-memory fakes, not integration evidence. */
class TargetRoleSelectionServiceTest {
    private static final UUID LEARNER_ID = uuid(1);
    private static final UUID ORGANIZATION_ID = uuid(2);
    private static final UUID ROLE_A_ID = uuid(11);
    private static final UUID ROLE_B_ID = uuid(12);
    private static final UUID ROLE_A_REFERENCE_ID = uuid(21);
    private static final UUID ROLE_B_REFERENCE_ID = uuid(22);
    private static final UUID CURRENT_SELECTION_ID = uuid(31);
    private static final UUID OTHER_SELECTION_ID = uuid(32);
    private static final UUID REQUEST_ID = uuid(41);
    private static final Instant NOW = Instant.parse("2026-10-02T03:00:00Z");

    @Test
    void requiresTrustedAuthenticatedActiveEmployeeBeforeReadingDependencies() {
        var fixture = new Fixture();
        fixture.actor.actor = Optional.empty();
        assertCode(Code.UNAUTHENTICATED, () -> fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "key-1")));

        fixture.actor.actor = Optional.of(new SelectionActor(LEARNER_ID, ORGANIZATION_ID, false, Set.of("EMPLOYEE")));
        assertCode(Code.FORBIDDEN, () -> fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "key-2")));

        fixture.actor.actor = Optional.of(new SelectionActor(LEARNER_ID, ORGANIZATION_ID, true, Set.of("MANAGER")));
        assertCode(Code.FORBIDDEN, () -> fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "key-3")));

        assertThat(fixture.catalog.calls).isZero();
        assertThat(fixture.transactions.calls).isZero();
        assertThat(fixture.store.findRequestCalls).isZero();
    }

    @Test
    void createsInitialSelectionUsingTrustedTenantAndRecheckedCatalogRole() {
        var fixture = new Fixture();

        var result = fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "initial-key"));

        assertThat(result.disposition()).isEqualTo(Disposition.APPLIED);
        assertThat(result.changed()).isTrue();
        assertThat(result.selection().learnerId()).isEqualTo(LEARNER_ID);
        assertThat(result.selection().roleSnapshot().id()).isEqualTo(ROLE_A_ID);
        assertThat(result.selection().targetRevision()).isEqualTo(1);
        assertThat(fixture.catalog.requestedOrganizationId).isEqualTo(ORGANIZATION_ID);
        assertThat(fixture.catalog.requestedRoleId).isEqualTo(ROLE_A_ID);
        assertThat(fixture.guard.calls).isZero();
        assertThat(fixture.pathways.archivedSelectionIds).isEmpty();
        assertThat(fixture.events.recorded).singleElement().satisfies(event -> {
            assertThat(event.type()).isEqualTo(EventType.SELECTED);
            assertThat(event.previousSelectionId()).isNull();
            assertThat(event.organizationId()).isEqualTo(ORGANIZATION_ID);
        });
    }

    @Test
    void changesRoleOnlyForExpectedCurrentSelectionAndChecksAssessment() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);

        var result = fixture.service.chooseTargetRole(command(ROLE_B_ID, CURRENT_SELECTION_ID, "change-key"));

        assertThat(result.disposition()).isEqualTo(Disposition.APPLIED);
        assertThat(result.selection().roleSnapshot().id()).isEqualTo(ROLE_B_ID);
        assertThat(result.selection().targetRevision()).isEqualTo(5);
        assertThat(fixture.guard.calls).isOne();
        assertThat(fixture.pathways.archivedSelectionIds).containsExactly(CURRENT_SELECTION_ID);
        assertThat(fixture.store.selection(CURRENT_SELECTION_ID).orElseThrow().isActive()).isFalse();
        assertThat(fixture.events.recorded).singleElement().satisfies(event -> {
            assertThat(event.type()).isEqualTo(EventType.CHANGED);
            assertThat(event.previousSelectionId()).isEqualTo(CURRENT_SELECTION_ID);
        });
    }

    @Test
    void sameRoleIsNoOpWithoutGuardRevisionPathwayOrEvent() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);

        var result = fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "noop-key"));

        assertThat(result.disposition()).isEqualTo(Disposition.UNCHANGED);
        assertThat(result.changed()).isFalse();
        assertThat(result.selection().selectionId()).isEqualTo(CURRENT_SELECTION_ID);
        assertThat(fixture.store.revision).isEqualTo(4);
        assertThat(fixture.guard.calls).isZero();
        assertThat(fixture.pathways.archivedSelectionIds).isEmpty();
        assertThat(fixture.events.recorded).isEmpty();
    }

    @Test
    void rejectsMissingExpectedSelectionWhenRequestWouldOverwriteCurrentRole() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);

        assertCode(Code.STALE_SELECTION,
                () -> fixture.service.chooseTargetRole(command(ROLE_B_ID, null, "missing-expected")));

        assertThat(fixture.store.activeSelection.orElseThrow().selectionId()).isEqualTo(CURRENT_SELECTION_ID);
        assertThat(fixture.store.revision).isEqualTo(4);
        assertThat(fixture.store.request("missing-expected").orElseThrow().status())
                .isEqualTo(RequestStatus.REJECTED);
    }

    @Test
    void rejectsStaleExpectedSelectionWithoutCallingAssessmentGuard() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);

        assertCode(Code.STALE_SELECTION,
                () -> fixture.service.chooseTargetRole(command(ROLE_B_ID, OTHER_SELECTION_ID, "stale-key")));

        assertThat(fixture.guard.calls).isZero();
        assertThat(fixture.pathways.archivedSelectionIds).isEmpty();
        assertThat(fixture.events.recorded).isEmpty();
    }

    @Test
    void blocksRoleChangeWhileAssessmentIsActive() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);
        fixture.guard.blocking = true;

        assertCode(Code.ASSESSMENT_IN_PROGRESS,
                () -> fixture.service.chooseTargetRole(command(ROLE_B_ID, CURRENT_SELECTION_ID, "guard-key")));

        assertThat(fixture.store.activeSelection.orElseThrow().selectionId()).isEqualTo(CURRENT_SELECTION_ID);
        assertThat(fixture.store.revision).isEqualTo(4);
        assertThat(fixture.store.request("guard-key").orElseThrow().status()).isEqualTo(RequestStatus.REJECTED);
        assertThat(fixture.pathways.archivedSelectionIds).isEmpty();
        assertThat(fixture.events.recorded).isEmpty();
    }

    @Test
    void successfulReplayPreservesOriginalChangedAndSkipsCatalogAndTransaction() {
        var fixture = new Fixture();
        var command = command(ROLE_A_ID, null, "replay-applied");
        var original = fixture.service.chooseTargetRole(command);
        int catalogCalls = fixture.catalog.calls;
        int transactionCalls = fixture.transactions.calls;

        var replay = fixture.service.chooseTargetRole(command);

        assertThat(original.changed()).isTrue();
        assertThat(replay.changed()).isTrue();
        assertThat(replay.selection()).isEqualTo(original.selection());
        assertThat(fixture.catalog.calls).isEqualTo(catalogCalls);
        assertThat(fixture.transactions.calls).isEqualTo(transactionCalls);
        assertThat(fixture.events.recorded).hasSize(1);
    }

    @Test
    void noOpReplayPreservesOriginalUnchangedOutcome() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);
        var command = command(ROLE_A_ID, null, "replay-noop");

        assertThat(fixture.service.chooseTargetRole(command).changed()).isFalse();
        assertThat(fixture.service.chooseTargetRole(command).changed()).isFalse();
        assertThat(fixture.store.revision).isEqualTo(4);
        assertThat(fixture.events.recorded).isEmpty();
    }

    @Test
    void sameIdempotencyKeyWithDifferentCanonicalHashConflicts() {
        var fixture = new Fixture();
        fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "shared-key"));

        assertCode(Code.IDEMPOTENCY_CONFLICT,
                () -> fixture.service.chooseTargetRole(command(ROLE_B_ID, null, "shared-key")));

        assertThat(fixture.catalog.calls).isOne();
        assertThat(fixture.transactions.calls).isOne();
        assertThat(fixture.events.recorded).hasSize(1);
    }

    @Test
    void pendingRequestReturnsRequestInProgressWithoutRecheckingCatalog() {
        var fixture = new Fixture();
        var command = command(ROLE_A_ID, null, "pending-key");
        fixture.store.givenPending("pending-key", SelectionRequestHasher.hash(command));

        assertCode(Code.REQUEST_IN_PROGRESS, () -> fixture.service.chooseTargetRole(command));

        assertThat(fixture.catalog.calls).isZero();
        assertThat(fixture.transactions.calls).isZero();
    }

    @Test
    void missingCatalogRoleIsMaskedAsRoleNotAvailable() {
        var fixture = new Fixture();
        fixture.catalog.roles.remove(ROLE_A_ID);

        assertCode(Code.ROLE_NOT_AVAILABLE,
                () -> fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "missing-role")));

        assertThat(fixture.catalog.requestedOrganizationId).isEqualTo(ORGANIZATION_ID);
        assertThat(fixture.transactions.calls).isZero();
        assertThat(fixture.store.requests).isEmpty();
    }

    @Test
    void catalogFailureMapsToCatalogUnavailableWithoutStartingTransaction() {
        var fixture = new Fixture();
        fixture.catalog.failure = new TargetRoleSelectionCatalogPort.CatalogUnavailableException(
                "catalog down", new IllegalStateException("offline"));

        assertCode(Code.CATALOG_UNAVAILABLE,
                () -> fixture.service.chooseTargetRole(command(ROLE_A_ID, null, "catalog-down")));

        assertThat(fixture.transactions.calls).isZero();
        assertThat(fixture.store.requests).isEmpty();
    }

    @Test
    void assessmentDependencyFailureMapsToDependencyUnavailableAndFakeTransactionRollsBack() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);
        fixture.guard.failure = new AssessmentActivityGuardPort.ActivityGuardUnavailableException(
                "assessment down", new IllegalStateException("offline"));

        assertCode(Code.DEPENDENCY_UNAVAILABLE,
                () -> fixture.service.chooseTargetRole(command(ROLE_B_ID, CURRENT_SELECTION_ID, "assessment-down")));

        assertThat(fixture.store.request("assessment-down")).isEmpty();
        assertThat(fixture.store.activeSelection.orElseThrow().selectionId()).isEqualTo(CURRENT_SELECTION_ID);
        assertThat(fixture.store.revision).isEqualTo(4);
        assertThat(fixture.events.recorded).isEmpty();
    }

    @Test
    void pathwayDependencyFailureMapsToDependencyUnavailableAndFakeTransactionRollsBack() {
        var fixture = new Fixture();
        fixture.givenCurrentSelection(ROLE_A_ID, 4);
        fixture.pathways.failure = new PathwayArchivePort.PathwayArchiveException(
                "pathway down", new IllegalStateException("offline"));

        assertCode(Code.DEPENDENCY_UNAVAILABLE,
                () -> fixture.service.chooseTargetRole(command(ROLE_B_ID, CURRENT_SELECTION_ID, "pathway-down")));

        assertThat(fixture.store.request("pathway-down")).isEmpty();
        assertThat(fixture.store.activeSelection.orElseThrow().selectionId()).isEqualTo(CURRENT_SELECTION_ID);
        assertThat(fixture.store.selection(CURRENT_SELECTION_ID).orElseThrow().isActive()).isTrue();
        assertThat(fixture.store.revision).isEqualTo(4);
        assertThat(fixture.events.recorded).isEmpty();
    }

    private static ChooseTargetRoleCommand command(UUID roleId, UUID expectedSelectionId, String key) {
        return new ChooseTargetRoleCommand(roleId, expectedSelectionId, key);
    }

    private static void assertCode(Code expected, ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(TargetRoleSelectionException.class,
                        exception -> assertThat(exception.code()).isEqualTo(expected));
    }

    private static UUID uuid(long value) {
        return new UUID(0L, value);
    }

    private static TargetRoleSnapshot snapshot(UUID roleId) {
        return new TargetRoleSnapshot(
                roleId,
                roleId.equals(ROLE_A_ID) ? "JAVA_P3" : "DATA_P3",
                roleId.equals(ROLE_A_ID) ? "Java Developer" : "Data Engineer",
                CareerTrack.PROFESSIONAL,
                Seniority.P3);
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run();
    }

    private static final class Fixture {
        private final FakeActorPort actor = new FakeActorPort();
        private final FakeCatalogPort catalog = new FakeCatalogPort();
        private final InMemoryStore store = new InMemoryStore();
        private final FakeAssessmentGuard guard = new FakeAssessmentGuard();
        private final FakePathwayArchive pathways = new FakePathwayArchive();
        private final FakeEventPort events = new FakeEventPort();
        private final FakeTransactionPort transactions = new FakeTransactionPort(store, pathways, events);
        private final TargetRoleSelectionService service;

        private Fixture() {
            var identifiers = new AtomicLong(100);
            var processor = new TargetSelectionCommandProcessor(
                    guard, pathways, events, store,
                    Clock.fixed(NOW, ZoneOffset.UTC),
                    () -> uuid(identifiers.incrementAndGet()));
            service = new TargetRoleSelectionService(actor, catalog, store, transactions, processor);
        }

        private void givenCurrentSelection(UUID roleId, long revision) {
            store.revision = revision;
            var selection = new TargetRoleSelection(
                    CURRENT_SELECTION_ID,
                    LEARNER_ID,
                    roleId.equals(ROLE_A_ID) ? ROLE_A_REFERENCE_ID : ROLE_B_REFERENCE_ID,
                    snapshot(roleId),
                    NOW.minusSeconds(3600),
                    null,
                    revision);
            store.activeSelection = Optional.of(selection);
            store.selections.put(selection.selectionId(), selection);
        }
    }

    private static final class FakeActorPort implements TargetSelectionActorPort {
        private Optional<SelectionActor> actor = Optional.of(
                new SelectionActor(LEARNER_ID, ORGANIZATION_ID, true, Set.of("employee")));

        @Override
        public Optional<SelectionActor> currentActor() {
            return actor;
        }
    }

    private static final class FakeCatalogPort implements TargetRoleSelectionCatalogPort {
        private final Map<UUID, SelectableTargetRole> roles = new HashMap<>(Map.of(
                ROLE_A_ID, new SelectableTargetRole(ROLE_A_REFERENCE_ID, snapshot(ROLE_A_ID)),
                ROLE_B_ID, new SelectableTargetRole(ROLE_B_REFERENCE_ID, snapshot(ROLE_B_ID))));
        private RuntimeException failure;
        private UUID requestedOrganizationId;
        private UUID requestedRoleId;
        private int calls;

        @Override
        public Optional<SelectableTargetRole> findSelectableRole(UUID organizationId, UUID roleId) {
            calls++;
            requestedOrganizationId = organizationId;
            requestedRoleId = roleId;
            if (failure != null) {
                throw failure;
            }
            if (!ORGANIZATION_ID.equals(organizationId)) {
                return Optional.empty();
            }
            return Optional.ofNullable(roles.get(roleId));
        }
    }

    private static final class FakeAssessmentGuard implements AssessmentActivityGuardPort {
        private boolean blocking;
        private RuntimeException failure;
        private int calls;

        @Override
        public boolean hasBlockingAssessment(UUID learnerId) {
            calls++;
            assertThat(learnerId).isEqualTo(LEARNER_ID);
            if (failure != null) {
                throw failure;
            }
            return blocking;
        }
    }

    private static final class FakePathwayArchive implements PathwayArchivePort {
        private final List<UUID> archivedSelectionIds = new ArrayList<>();
        private RuntimeException failure;

        @Override
        public ArchiveOutcome archiveCurrentPathway(UUID learnerId, UUID selectionId, Instant archivedAt) {
            assertThat(learnerId).isEqualTo(LEARNER_ID);
            assertThat(archivedAt).isEqualTo(NOW);
            if (failure != null) {
                throw failure;
            }
            archivedSelectionIds.add(selectionId);
            return ArchiveOutcome.ARCHIVED;
        }
    }

    private static final class FakeEventPort implements TargetSelectionEventPort {
        private final List<TargetSelectionEvent> recorded = new ArrayList<>();

        @Override
        public void record(TargetSelectionEvent event) {
            recorded.add(event);
        }
    }

    private static final class FakeTransactionPort implements SelectionTransactionPort {
        private final InMemoryStore store;
        private final FakePathwayArchive pathways;
        private final FakeEventPort events;
        private int calls;

        private FakeTransactionPort(InMemoryStore store, FakePathwayArchive pathways, FakeEventPort events) {
            this.store = store;
            this.pathways = pathways;
            this.events = events;
        }

        @Override
        public <T> T required(Supplier<T> work) {
            calls++;
            var storeSnapshot = store.snapshotState();
            var archivedSnapshot = List.copyOf(pathways.archivedSelectionIds);
            var eventSnapshot = List.copyOf(events.recorded);
            try {
                return work.get();
            } catch (RuntimeException failure) {
                store.restore(storeSnapshot);
                pathways.archivedSelectionIds.clear();
                pathways.archivedSelectionIds.addAll(archivedSnapshot);
                events.recorded.clear();
                events.recorded.addAll(eventSnapshot);
                throw failure;
            }
        }
    }

    private static final class InMemoryStore implements TargetSelectionStorePort {
        private long revision;
        private Optional<TargetRoleSelection> activeSelection = Optional.empty();
        private Map<UUID, TargetRoleSelection> selections = new HashMap<>();
        private Map<String, RequestEntry> requests = new HashMap<>();
        private int findRequestCalls;

        @Override
        public LearnerTargetState lockLearner(UUID learnerId) {
            assertThat(learnerId).isEqualTo(LEARNER_ID);
            return new LearnerTargetState(learnerId, revision);
        }

        @Override
        public Optional<TargetRoleSelection> findActiveSelection(UUID learnerId) {
            assertThat(learnerId).isEqualTo(LEARNER_ID);
            return activeSelection;
        }

        @Override
        public Optional<TargetRoleSelection> findSelection(UUID learnerId, UUID selectionId, long targetRevision) {
            assertThat(learnerId).isEqualTo(LEARNER_ID);
            return Optional.ofNullable(selections.get(selectionId))
                    .filter(selection -> selection.targetRevision() == targetRevision);
        }

        @Override
        public Optional<StoredSelectionRequest> findRequest(UUID actorId, String idempotencyKey) {
            findRequestCalls++;
            assertThat(actorId).isEqualTo(LEARNER_ID);
            return Optional.ofNullable(requests.get(idempotencyKey)).map(RequestEntry::request);
        }

        @Override
        public boolean claimRequest(PendingSelectionRequest request) {
            if (requests.containsKey(request.idempotencyKey())) {
                return false;
            }
            requests.put(request.idempotencyKey(), new RequestEntry(
                    request.requestId(),
                    new StoredSelectionRequest(
                            request.requestId(), request.requestHash(), RequestStatus.PENDING,
                            null, null, null, null)));
            return true;
        }

        @Override
        public void endSelection(UUID learnerId, UUID selectionId, Instant endedAt) {
            var ended = selection(selectionId).orElseThrow().endAt(endedAt);
            selections.put(selectionId, ended);
            activeSelection = Optional.empty();
        }

        @Override
        public void insertSelection(TargetRoleSelection selection) {
            assertThat(activeSelection).isEmpty();
            selections.put(selection.selectionId(), selection);
            activeSelection = Optional.of(selection);
        }

        @Override
        public void updateTargetRevision(UUID learnerId, long expectedRevision, long newRevision) {
            assertThat(learnerId).isEqualTo(LEARNER_ID);
            assertThat(revision).isEqualTo(expectedRevision);
            revision = newRevision;
        }

        @Override
        public void completeRequest(
                UUID requestId, UUID selectionId, long targetRevision, boolean changed, Instant completedAt) {
            replaceRequest(requestId, request -> new StoredSelectionRequest(
                    requestId, request.requestHash(), RequestStatus.SUCCEEDED,
                    selectionId, targetRevision, changed, null));
        }

        @Override
        public void rejectRequest(UUID requestId, String outcomeCode, Instant completedAt) {
            replaceRequest(requestId, request -> new StoredSelectionRequest(
                    requestId, request.requestHash(), RequestStatus.REJECTED,
                    null, null, null, outcomeCode));
        }

        private void givenPending(String key, String hash) {
            requests.put(key, new RequestEntry(
                    REQUEST_ID,
                    new StoredSelectionRequest(
                            REQUEST_ID, hash, RequestStatus.PENDING, null, null, null, null)));
        }

        private Optional<StoredSelectionRequest> request(String key) {
            return Optional.ofNullable(requests.get(key)).map(RequestEntry::request);
        }

        private Optional<TargetRoleSelection> selection(UUID selectionId) {
            return Optional.ofNullable(selections.get(selectionId));
        }

        private void replaceRequest(
                UUID requestId,
                java.util.function.Function<StoredSelectionRequest, StoredSelectionRequest> replacement) {
            var matching = requests.entrySet().stream()
                    .filter(entry -> entry.getValue().requestId().equals(requestId))
                    .findFirst()
                    .orElseThrow();
            matching.setValue(new RequestEntry(requestId, replacement.apply(matching.getValue().request())));
        }

        private StoreState snapshotState() {
            return new StoreState(revision, activeSelection, new HashMap<>(selections), new HashMap<>(requests));
        }

        private void restore(StoreState state) {
            revision = state.revision();
            activeSelection = state.activeSelection();
            selections = new HashMap<>(state.selections());
            requests = new HashMap<>(state.requests());
        }

        private record RequestEntry(UUID requestId, StoredSelectionRequest request) {}

        private record StoreState(
                long revision,
                Optional<TargetRoleSelection> activeSelection,
                Map<UUID, TargetRoleSelection> selections,
                Map<String, RequestEntry> requests) {}
    }
}
