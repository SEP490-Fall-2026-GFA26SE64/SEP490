package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.exception.InitialPathwayFailure;
import com.adaptlearngraph.repository.CurrentRoleSelectionStore;
import com.adaptlearngraph.repository.DevelopmentReportJpaRepository;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;

/** FR-04.07 report policy: same-organization employees only, read-only owners, explicit unavailable sections. */
class EmployeeDevelopmentReportServiceTest {
    static final UUID ORG=UUID.fromString("e0000000-0000-0000-0000-000000000001");
    static final UUID ANA=UUID.fromString("a0000000-0000-0000-0000-0000000000a1");
    static final UUID BEN=UUID.fromString("a0000000-0000-0000-0000-0000000000b2");
    static final UUID EXPERT=UUID.fromString("a0000000-0000-0000-0000-0000000000c3");
    static final UUID DEPT=UUID.randomUUID(),JOB=UUID.randomUUID();
    EmployeeDevelopmentReportService.Managers managers;SubscriptionWorkspaceStore workspaces;CurrentRoleSelectionStore selections;
    DevelopmentReportJpaRepository reports;RequirementPathwayView pathways;RequirementPathwayAdmissionService admission;EmployeeDevelopmentReportService service;

    @BeforeEach void fixture() {
        managers=mock(EmployeeDevelopmentReportService.Managers.class);workspaces=mock(SubscriptionWorkspaceStore.class);
        selections=mock(CurrentRoleSelectionStore.class);reports=mock(DevelopmentReportJpaRepository.class);
        pathways=mock(RequirementPathwayView.class);admission=mock(RequirementPathwayAdmissionService.class);
        when(managers.requireOrganization()).thenReturn(ORG);
        when(workspaces.members(ORG)).thenReturn(List.of(member(BEN,"Ben","EMPLOYEE"),member(EXPERT,"Chen","DOMAIN_EXPERT"),member(ANA,"Ana","EMPLOYEE")));
        when(selections.current(any())).thenReturn(Optional.empty());
        service=new EmployeeDevelopmentReportService(managers,workspaces,selections,reports,pathways,admission);
    }

    @Test void listsOnlyEmployeesOfTheManagersOrganizationWithAggregatedProgress() {
        var path=mock(DevelopmentReportJpaRepository.PathwayRow.class);
        when(path.getLearnerId()).thenReturn(ANA);when(path.getRequiredSteps()).thenReturn(4L);when(path.getFulfilledSteps()).thenReturn(3L);
        when(path.getTimingState()).thenReturn("IN_PROGRESS");when(path.getStartedAt()).thenReturn(Instant.parse("2026-10-01T00:00:00Z"));
        var assessment=mock(DevelopmentReportJpaRepository.AssessmentStats.class);
        when(assessment.getLearnerId()).thenReturn(ANA);when(assessment.getFinalized()).thenReturn(2L);when(assessment.getPassedGroups()).thenReturn(5L);
        when(assessment.getTotalGroups()).thenReturn(6L);when(assessment.getLastAssessmentAt()).thenReturn(Instant.parse("2026-11-02T00:00:00Z"));
        var modules=mock(DevelopmentReportJpaRepository.ModuleStats.class);
        when(modules.getLearnerId()).thenReturn(ANA.toString());when(modules.getCompletedModules()).thenReturn(3L);
        when(reports.pathways(ORG)).thenReturn(List.of(path));when(reports.assessmentStats(ORG)).thenReturn(List.of(assessment));
        when(reports.moduleStats(ORG)).thenReturn(List.of(modules));

        var employees=service.employees().employees();

        assertThat(employees).extracting(EmployeeDevelopmentReportService.Employee::fullName).containsExactly("Ana","Ben");
        var ana=employees.getFirst();
        assertThat(ana.departmentName()).isEqualTo("Engineering");assertThat(ana.jobPositionName()).isEqualTo("Developer");
        assertThat(ana.pathway().fulfilledSteps()).isEqualTo(3);assertThat(ana.assessments().passedGroups()).isEqualTo(5);
        assertThat(ana.evidence().completedModules()).isEqualTo(3);assertThat(ana.lastActivityAt()).isEqualTo(Instant.parse("2026-11-02T00:00:00Z"));
        var ben=employees.get(1);
        assertThat(ben.pathway()).isNull();assertThat(ben.assessments().attempts()).isZero();assertThat(ben.target()).isNull();
        verify(selections,never()).transaction(any(),any());
    }

    @Test void unknownOrNonEmployeeAccountIsNotFoundWithoutReadingLearnerOwners() {
        for(var account:List.of(UUID.randomUUID(),EXPERT))
            assertThatThrownBy(()->service.employee(account)).isInstanceOf(InitialPathwayFailure.class).hasMessage("EMPLOYEE_NOT_FOUND");
        verifyNoInteractions(pathways,admission);
        verify(reports,never()).attempts(any(),any(),anyInt());
    }

    @Test void unreadableSectionsAreReportedExplicitlyInsteadOfFabricated() {
        when(pathways.currentFor(ORG,ANA)).thenThrow(new InitialPathwayFailure(503,"PATHWAY_REVISION_INTEGRITY_FAILURE"));
        when(reports.attempts(ORG,ANA,EmployeeDevelopmentReportService.ATTEMPT_LIMIT)).thenReturn(List.of());

        var detail=service.employee(ANA);

        assertThat(detail.competency().data()).isNull();assertThat(detail.competency().unavailableCode()).isEqualTo("TARGET_NOT_SELECTED");
        assertThat(detail.pathway().data()).isNull();assertThat(detail.pathway().unavailableCode()).isEqualTo("PATHWAY_REVISION_INTEGRITY_FAILURE");
        assertThat(detail.assessments()).isEmpty();
        verifyNoInteractions(admission);
        verify(reports,never()).groups(any(),any(),any());
    }

    @Test void authorizationFailureFromAnOwnerIsNotHiddenAsUnavailableData() {
        when(pathways.currentFor(ORG,ANA)).thenThrow(new InitialPathwayFailure(403,"FORBIDDEN"));
        when(reports.attempts(ORG,ANA,EmployeeDevelopmentReportService.ATTEMPT_LIMIT)).thenReturn(List.of());
        assertThatThrownBy(()->service.employee(ANA)).isInstanceOf(InitialPathwayFailure.class).hasMessage("FORBIDDEN");
    }

    @Test void nonManagerIsRejectedBeforeAnyOrganizationRead() {
        when(managers.requireOrganization()).thenThrow(new InitialPathwayFailure(403,"FORBIDDEN"));
        assertThatThrownBy(service::employees).hasMessage("FORBIDDEN");
        assertThatThrownBy(()->service.employee(ANA)).hasMessage("FORBIDDEN");
        verifyNoInteractions(workspaces,reports,pathways,admission,selections);
    }

    static SubscriptionWorkspaceStore.Member member(UUID account,String name,String role) {
        return new SubscriptionWorkspaceStore.Member(UUID.randomUUID(),account,name,name.toLowerCase()+"@example.test",true,Set.of(role),
                DEPT,JOB,1,"Engineering","Developer",true);
    }
}
