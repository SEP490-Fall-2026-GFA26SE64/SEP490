package com.adaptlearngraph.pathway.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class InitialPathwayViewTest {
    ReviewFixture f;InitialPathwayAccess access;InitialPathwayView view;
    @BeforeEach void fixture(){f=new ReviewFixture();access=mock(InitialPathwayAccess.class);
        when(f.actors.require()).thenReturn(new Actor(ReviewFixture.ORG,ReviewFixture.LEARNER,Role.EMPLOYEE));
        view=new InitialPathwayView(f.actors,f.store,f.coordination,access);}
    @Test void E02_noRequestReturnsEmptyWithoutGeneratingOrWriting() {
        when(f.store.current(f.scope)).thenReturn(Optional.empty());var result=view.current();
        assertThat(result.status()).isNull();assertThat(result.modules()).isEmpty();assertThat(result.baseline()).isNull();
        verifyNoInteractions(access,f.receipts,f.builder);verifyNoWrites();
    }
    @ParameterizedTest @EnumSource(value=Generation.class,names={"PENDING","GENERATING","NO_LEARNING_REQUIRED","UNRESOLVED","BLOCKED","FAILED_RETRYABLE","STALE"})
    void E02_generationWithoutDraftExposesOnlySafeLifecycleAndNeverApprovesOrCompletes(Generation generation) {
        var frozen=f.frozen;
        if(generation==Generation.NO_LEARNING_REQUIRED) {
            var noGap=com.adaptlearngraph.recommendation.domain.RoleGap.calculate(f.binding.requirements(),Map.of("S",new com.adaptlearngraph.recommendation.domain.RoleGap.Evidence(new java.math.BigDecimal("0.9"),"known")),Map.of());
            var p=f.frozen.input().preview();
            var preview=new RoleGapPreview.Preview(p.businessRoleId(),p.roleId(),p.levelId(),p.roleName(),p.levelName(),p.expectedSelectionId(),p.expectedSelectionRevision(),p.gapInputHash(),p.versions(),noGap);
            frozen=new Frozen(new RoleGapPreview.Prepared(f.binding,null,preview),f.selection,f.frozen.planningHash(),f.frozen.configurationHash());
        }
        f.current=new Request(ReviewFixture.ID,f.scope,f.selection,frozen,generation,null,Review.NONE,null,null,null);
        var result=view.current();
        assertThat(result.status().generationStatus()).isEqualTo(generation);assertThat(result.status().displayState()).isEqualTo(generation.name());
        assertThat(result.status().reviewStatus()).isEqualTo(Review.NONE);assertThat(result.status().revision()).isNull();
        assertThat(result.modules()).isEmpty();assertThat(result.dependencies()).isEmpty();assertThat(result.context()).isNull();assertThat(result.baseline()).isNull();
        verifyNoInteractions(access,f.builder);verifyNoWrites();
    }
    @ParameterizedTest @EnumSource(value=Review.class,names={"NONE","AWAITING_EXPERT_REVIEW","STALE"})
    void E02_unapprovedDraftNeverLeaksModulesCandidatesOrFrozenBaseline(Review state) {
        f.current=f.request(state,f.revision);var result=view.current();assertThat(result.modules()).isEmpty();
        assertThat(result.dependencies()).isEmpty();assertThat(result.context()).isNull();assertThat(result.baseline()).isNull();verifyNoInteractions(access);verifyNoWrites();
    }
    @Test void E03_exactApprovedRevisionOrderHashAndFrozenContextWithUnavailableEntry() {
        f.current=f.request(Review.APPROVED,f.revision);when(access.requireEntry(ReviewFixture.ID,"M-A")).thenThrow(new Failure(503,"CONTENT_ACCESS_UNAVAILABLE"));
        var result=view.current();assertThat(result.status().revision()).isEqualTo(4);assertThat(result.status().revisionContentHash()).isEqualTo(f.revision.contentHash());
        assertThat(result.modules()).singleElement().satisfies(m->{assertThat(m.module().id()).isEqualTo("M-A");assertThat(m.module().ordinal()).isEqualTo(1);
            assertThat(m.accessState()).isEqualTo("UNAVAILABLE");assertThat(m.entry()).isNull();assertThat(m.module().targets().getFirst().instructionLevel()).isNull();});
        assertThat(result.context().roleId()).isEqualTo("role-test");assertThat(result.baseline()).isEqualTo(f.gaps);verifyNoWrites();
    }
    @Test void E08_liveReadinessChangesOnlyProjectionNeverFrozenRevision() {
        f.current=f.request(Review.APPROVED,f.revision);var before=f.revision;
        when(access.requireEntry(ReviewFixture.ID,"M-A")).thenThrow(new Failure(423,"PREREQUISITE_NOT_READY")).thenThrow(new Failure(503,"CONTENT_UNAVAILABLE"));
        assertThat(view.current().modules().getFirst().accessState()).isEqualTo("LOCKED");assertThat(view.current().modules().getFirst().accessState()).isEqualTo("UNAVAILABLE");
        assertThat(f.revision).isSameAs(before);assertThat(f.savedReceipts).isEmpty();verifyNoWrites();
    }
    @Test void E07_archiveRequiresRecordedExactApprovalAndNeverAsksForLearningEntry() {
        f.current=f.request(Review.ARCHIVED,f.revision);when(f.store.approved(f.scope,ReviewFixture.ID,4,f.revision.contentHash())).thenReturn(true);
        var result=view.archived(ReviewFixture.ID);assertThat(result.archived()).isTrue();assertThat(result.modules()).singleElement().satisfies(m->{assertThat(m.accessState()).isEqualTo("ARCHIVED");assertThat(m.entry()).isNull();});
        verifyNoInteractions(access);verifyNoWrites();
        when(f.store.approved(f.scope,ReviewFixture.ID,4,f.revision.contentHash())).thenReturn(false);assertThat(view.archived(ReviewFixture.ID).modules()).isEmpty();
    }
    @Test void E01_foreignMissingWrongRoleAndOutageRemainDistinct() {
        var foreign=new UUID(0,999);assertThatThrownBy(()->view.request(foreign)).hasMessage("PATHWAY_NOT_FOUND");
        when(f.actors.require()).thenReturn(f.actor);assertThatThrownBy(()->view.current()).hasMessage("FORBIDDEN");
        when(f.actors.require()).thenReturn(new Actor(ReviewFixture.ORG,ReviewFixture.LEARNER,Role.EMPLOYEE));
        when(f.store.current(f.scope)).thenThrow(new Failure(503,"STORE_UNAVAILABLE"));assertThatThrownBy(()->view.current()).hasMessage("STORE_UNAVAILABLE");verifyNoWrites();
    }
    @Test void E03_pointerDriftDuringProjectionRejectsMixedSnapshot() {
        f.current=f.request(Review.APPROVED,f.revision);var approved=f.current;
        when(f.store.request(f.scope,ReviewFixture.ID)).thenReturn(Optional.of(new Request(approved.id(),approved.scope(),approved.selection(),approved.frozen(),approved.generation(),null,Review.ARCHIVED,4L,approved.validation(),approved.contentHash())));
        assertThatThrownBy(()->view.current()).hasMessage("STALE_PATHWAY_VIEW");verifyNoWrites();
    }
    @Test void E02_selectionDriftRejectsCurrentRead() {
        when(f.coordination.current(f.scope)).thenReturn(Optional.empty());assertThatThrownBy(()->view.current()).hasMessage("STALE_SELECTION");verifyNoInteractions(access);verifyNoWrites();
    }
    @Test void E03_reviewMembershipMoveCheckAndExactApprovalProjectSameSavedOrder() {
        when(f.actors.require()).thenReturn(f.actor);
        f.review.edit(ReviewFixture.ID,"include-order",f.edit("M-B"),true);
        f.review.move(ReviewFixture.ID,"move-order",new InitialPathwayReview.Move("M-B","UP",f.revision.revision(),f.revision.contentHash(),null));
        assertThat(f.review.validate(ReviewFixture.ID).revisionContentHash()).isEqualTo(f.revision.contentHash());
        f.review.confirm(ReviewFixture.ID,"approve-order",f.expected());
        var approved=f.revision;
        when(f.actors.require()).thenReturn(new Actor(ReviewFixture.ORG,ReviewFixture.LEARNER,Role.EMPLOYEE));
        when(access.requireEntry(eq(ReviewFixture.ID),anyString())).thenThrow(new Failure(503,"CONTENT_ACCESS_UNAVAILABLE"));
        clearInvocations(f.store,f.receipts);
        var projected=view.current();
        assertThat(projected.modules()).extracting(m->m.module().id()).containsExactly("M-B","M-A");
        assertThat(projected.modules()).extracting(m->m.module().ordinal()).containsExactly(1,2);
        assertThat(projected.status().revision()).isEqualTo(6);assertThat(projected.status().revisionContentHash()).isEqualTo(approved.contentHash());
        verifyNoWrites();
    }
    void verifyNoWrites(){verify(f.store,never()).create(any(),any(),any(),any());verify(f.store,never()).saveRevision(any(),any(),any(),any(),any(),any(),any(),any());verify(f.store,never()).approve(any(),any(),any(),any());verify(f.receipts,never()).save(any(),any(),any(),any(),any());}
}
