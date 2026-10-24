package com.adaptlearngraph.assessment.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.AnswerItem;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.Code;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineAnswerReviewAuthorizer;
import com.adaptlearngraph.assessment.application.port.out.BaselineAnswerReviewStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BaselineAnswerReviewServiceTest {
    private static final UUID ACTOR_ID = uuid(1);
    private static final UUID ORGANIZATION_ID = uuid(2);
    private static final UUID ASSESSMENT_ID = uuid(3);
    private static final UUID ITEM_ID = uuid(4);
    private static final Instant NOW = Instant.parse("2026-10-17T08:00:00Z");

    @Test
    void revealUsesTrustedActorTenantAndAppendsAuditInSameStoreOperation() {
        RecordingStore store = new RecordingStore();
        var service = service(Optional.of(manager()), (actor, ignored) -> true, store);
        var result = service.reveal(ASSESSMENT_ID);
        assertThat(result.items()).containsExactly(new AnswerItem(ITEM_ID, "{\"correct\":\"A\"}"));
        assertThat(store.organizationId).isEqualTo(ORGANIZATION_ID);
        assertThat(store.actorId).isEqualTo(ACTOR_ID);
        assertThat(store.assessmentVersionId).isEqualTo(ASSESSMENT_ID);
        assertThat(store.revealedAt).isEqualTo(NOW);
    }

    @Test
    void unauthenticatedInactiveWrongRoleAndDeniedActorsCannotReachStore() {
        RecordingStore store = new RecordingStore();
        assertFailure(service(Optional.empty(), (a, id) -> true, store), Code.UNAUTHENTICATED);
        assertFailure(service(Optional.of(actor(false, "LD_MANAGER")), (a, id) -> true, store), Code.FORBIDDEN);
        assertFailure(service(Optional.of(actor(true, "EXPERT")), (a, id) -> true, store), Code.FORBIDDEN);
        assertFailure(service(Optional.of(manager()), (a, id) -> false, store), Code.FORBIDDEN);
        assertThat(store.calls).isZero();
    }

    @Test
    void storeFailuresAreMapped() {
        assertMappedStoreFailure(new BaselineAnswerReviewStore.NotFound("missing"), Code.NOT_FOUND);
        assertMappedStoreFailure(new BaselineAnswerReviewStore.DependencyUnavailable("database unavailable", null),
                Code.DEPENDENCY_UNAVAILABLE);
    }

    private static void assertMappedStoreFailure(RuntimeException storeFailure, Code expected) {
        BaselineAnswerReviewStore store = (organizationId, assessmentVersionId, actorId, at) -> {
            throw storeFailure;
        };
        assertFailure(service(Optional.of(manager()), (a, id) -> true, store), expected);
    }

    private static void assertFailure(BaselineAnswerReviewService service, Code code) {
        assertThatThrownBy(() -> service.reveal(ASSESSMENT_ID)).isInstanceOfSatisfying(Failure.class,
                failure -> assertThat(failure.code()).isEqualTo(code));
    }

    private static BaselineAnswerReviewService service(
            Optional<Actor> actor, BaselineAnswerReviewAuthorizer authorizer, BaselineAnswerReviewStore store) {
        return new BaselineAnswerReviewService(() -> actor, authorizer, store,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static Actor manager() { return actor(true, "LD_MANAGER"); }
    private static Actor actor(boolean active, String role) {
        return new Actor(ACTOR_ID, ORGANIZATION_ID.toString(), active, Set.of(role));
    }
    private static UUID uuid(long value) { return new UUID(0L, value); }

    private static final class RecordingStore implements BaselineAnswerReviewStore {
        private int calls;
        private UUID organizationId;
        private UUID assessmentVersionId;
        private UUID actorId;
        private Instant revealedAt;

        @Override
        public List<AnswerItem> revealAndAudit(
                UUID organizationId, UUID assessmentVersionId, UUID actorId, Instant revealedAt) {
            calls++;
            this.organizationId = organizationId;
            this.assessmentVersionId = assessmentVersionId;
            this.actorId = actorId;
            this.revealedAt = revealedAt;
            return List.of(new AnswerItem(ITEM_ID, "{\"correct\":\"A\"}"));
        }
    }
}
