package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.Code;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.Failure;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.JobPositionQuery;
import com.adaptlearngraph.repository.BaselineAssessmentDraftStore;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore;
import com.adaptlearngraph.repository.BaselineBlueprintStore;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort.CatalogJobPositionSummary;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BaselineAssessmentManagementServiceTest {
    private static final UUID ORGANIZATION_ID = new UUID(0L, 1);
    private static final UUID ACTOR_ID = new UUID(0L, 2);
    private static final UUID ASSESSMENT_ID = new UUID(0L, 3);

    @Test
    void unauthenticatedInactiveAndWrongRoleActorsAreRejectedBeforeCatalogAccess() {
        Fixture fixture = new Fixture();
        assertFailure(Code.UNAUTHENTICATED,
                () -> fixture.service(Optional.empty()).listJobPositions(query()));
        assertFailure(Code.FORBIDDEN,
                () -> fixture.service(Optional.of(actor(false, "LD_MANAGER"))).listJobPositions(query()));
        assertFailure(Code.FORBIDDEN,
                () -> fixture.service(Optional.of(actor(true, "EXPERT"))).listJobPositions(query()));
        verify(fixture.catalog, never()).findAvailableJobPositions(ORGANIZATION_ID.toString());
    }

    @Test
    void landingUsesOnlyTheTrustedActorOrganization() {
        Fixture fixture = new Fixture();
        when(fixture.catalog.findAvailableJobPositions(ORGANIZATION_ID.toString())).thenReturn(List.of(
                new CatalogJobPositionSummary("jobPosition-java", "Java Engineer", "release-1", 0)));

        var page = fixture.service(Optional.of(actor(true, "LD_MANAGER")))
                .listJobPositions(query());

        assertThat(page.items()).extracting(item -> item.jobPositionId())
                .containsExactly("jobPosition-java");
        verify(fixture.catalog).findAvailableJobPositions(ORGANIZATION_ID.toString());
    }

    @Test
    void crossTenantAssessmentLookupDoesNotFallThroughToDraftStore() {
        Fixture fixture = new Fixture();
        when(fixture.management.findScopeByAssessment(ORGANIZATION_ID, ASSESSMENT_ID))
                .thenReturn(Optional.empty());
        var service = fixture.service(Optional.of(actor(true, "LD_MANAGER")));

        assertFailure(Code.NOT_FOUND, () -> service.getAssessmentVersion(ASSESSMENT_ID));

        verify(fixture.management).findScopeByAssessment(ORGANIZATION_ID, ASSESSMENT_ID);
        verify(fixture.draftUseCase, never()).get(ASSESSMENT_ID);
    }

    private static JobPositionQuery query() {
        return new JobPositionQuery("", "", "name_asc", 0, 20);
    }

    private static Actor actor(boolean active, String role) {
        return new Actor(ACTOR_ID, ORGANIZATION_ID.toString(), active, Set.of(role));
    }

    private static void assertFailure(Code expected, Runnable operation) {
        assertThatThrownBy(operation::run).isInstanceOfSatisfying(Failure.class,
                failure -> assertThat(failure.code()).isEqualTo(expected));
    }

    private static final class Fixture {
        private final BaselineJobPositionCatalogPort catalog = mock(BaselineJobPositionCatalogPort.class);
        private final BaselineBlueprintStore blueprints = mock(BaselineBlueprintStore.class);
        private final BaselineBlueprintValidationPort validation = mock(BaselineBlueprintValidationPort.class);
        private final BaselineAssessmentDraftUseCase draftUseCase = mock(BaselineAssessmentDraftUseCase.class);
        private final BaselineAssessmentDraftStore drafts = mock(BaselineAssessmentDraftStore.class);
        private final BaselineAssessmentManagementStore management = mock(BaselineAssessmentManagementStore.class);

        private BaselineAssessmentManagementService service(Optional<Actor> actor) {
            ActorPort actors = () -> actor;
            return new BaselineAssessmentManagementService(
                    actors, catalog, blueprints, validation, draftUseCase, drafts,
                    management, new ObjectMapper());
        }
    }
}
