package com.adaptlearngraph.pathway.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class InitialPathwayReviewTest {
    ReviewFixture f;
    @BeforeEach void fixture(){f=new ReviewFixture();}
    @Test void R03_includeCreatesOneRevisionAndExactRetainedReceipt() {
        var command=f.edit("M-B");var receipt=f.review.edit(ReviewFixture.ID,"include-1",command,true);
        assertThat(f.revision.revision()).isEqualTo(5);assertThat(f.revision.selectedModules()).containsExactlyInAnyOrder("M-A","M-B");
        assertThat(f.revision.overrides()).containsExactly(List.of("INCLUDE","M-B","test reason"));
        assertThat(f.history).hasSize(2);assertThat(f.current.review()).isEqualTo(Review.AWAITING_EXPERT_REVIEW);
        assertThat(f.review.edit(ReviewFixture.ID,"include-1",command,true)).isEqualTo(receipt);assertThat(f.history).hasSize(2);
        verify(f.store,never()).approve(any(),any(),any(),any());
    }
    @Test void R06_excludeRemoveNeutralAndIncludeRepairRetainEarlierActions() {
        f.review.edit(ReviewFixture.ID,"exclude-1",f.edit("M-A"),false);
        assertThat(f.revision.selectedModules()).isEmpty();assertThat(f.revision.validation()).isEqualTo(Validation.UNRESOLVED);
        assertThatThrownBy(()->f.review.confirm(ReviewFixture.ID,"invalid-confirm",f.expected())).hasMessage("INVALID_PATHWAY_DRAFT");
        f.review.remove(ReviewFixture.ID,"remove-1",f.edit("M-A"));
        assertThat(f.revision.overrides()).extracting(List::getFirst).containsExactly("EXCLUDE","REMOVE");
        f.review.edit(ReviewFixture.ID,"repair-1",f.edit("M-B"),true);
        assertThat(f.revision.validation()).isEqualTo(Validation.VALID);assertThat(f.revision.selectedModules()).containsExactly("M-B");
        assertThat(f.revision.overrides()).extracting(List::getFirst).containsExactly("EXCLUDE","REMOVE","INCLUDE");
        assertThat(f.history).hasSize(4);
    }
    @Test void R05_currentNoopsWriteReceiptWithoutNewRevisionOrPlannerCall() {
        f.review.edit(ReviewFixture.ID,"noop-include",f.edit("M-A"),true);
        f.review.edit(ReviewFixture.ID,"noop-exclude",f.edit("M-B"),false);
        f.review.remove(ReviewFixture.ID,"noop-remove",f.edit("M-B"));
        assertThat(f.history).hasSize(1);assertThat(f.savedReceipts).hasSize(3);verifyNoInteractions(f.builder);
        verify(f.store,never()).saveRevision(any(),any(),any(),any(),any(),any(),any(),any());
    }
    @Test void R04_ineligibleForeignModuleNeverWrites() {
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"foreign",f.edit("FOREIGN"),true)).hasMessage("MODULE_NOT_ELIGIBLE");
        assertThat(f.history).hasSize(1);assertThat(f.savedReceipts).isEmpty();
    }
    @Test void R09_freshValidationIsReadOnlyAndMatchesPersistedIdentity() {
        var first=f.review.validate(ReviewFixture.ID);var second=f.review.validate(ReviewFixture.ID);
        assertThat(first.validationStatus()).isEqualTo(Validation.VALID);assertThat(second.revisionContentHash()).isEqualTo(f.revision.contentHash());
        verify(f.builder,times(2)).build(any(),any(),any(),any());assertThat(f.history).hasSize(1);assertThat(f.savedReceipts).isEmpty();
        verify(f.store,never()).approve(any(),any(),any(),any());
    }
    @Test void R09_confirmApprovesExactRevisionWithoutCreatingRevision() {
        var expected=f.expected();f.review.confirm(ReviewFixture.ID,"approve-1",expected);
        assertThat(f.current.review()).isEqualTo(Review.APPROVED);assertThat(f.history).hasSize(1);
        verify(f.store).approve(f.scope,f.revision,f.actor,f.assignment);
        assertThat(f.savedReceipts).hasSize(1);
    }
    @Test void R11_originalReceiptAfterLaterEditReturnsOriginalOutcomeWithoutReapply() {
        var old=f.edit("M-B");var original=f.review.edit(ReviewFixture.ID,"old-key",old,true);
        f.review.remove(ReviewFixture.ID,"later-key",f.edit("M-B"));assertThat(f.revision.revision()).isEqualTo(6);
        assertThat(f.review.edit(ReviewFixture.ID,"old-key",old,true)).isEqualTo(original);
        assertThat(original.responseJson()).contains("\"revision\":5");assertThat(f.review.detail(ReviewFixture.ID).summary().revision()).isEqualTo(6);
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"new-stale-key",old,true)).hasMessage("STALE_REVISION");
        assertThat(f.history).hasSize(3);
    }
    @Test void R10_sameKeyChangedBodyConflictsWithoutWrite() {
        var old=f.edit("M-B");f.review.edit(ReviewFixture.ID,"same-key",old,true);
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"same-key",new InitialPathwayReview.Edit("M-B",old.expectedRevision(),old.expectedContentHash(),"changed"),true)).hasMessage("IDEMPOTENCY_CONFLICT");
        assertThat(f.history).hasSize(2);assertThat(f.savedReceipts).hasSize(1);
    }
    @Test void R01_revokedAssignmentDeniesEvenPreviouslyAcceptedReplayBeforeReceiptRead() {
        var old=f.edit("M-B");f.review.edit(ReviewFixture.ID,"accepted",old,true);clearInvocations(f.receipts,f.store);
        when(f.assignments.require(f.actor,ReviewFixture.ID)).thenThrow(new Failure(404,"PATHWAY_NOT_FOUND"));
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"accepted",old,true)).hasMessage("PATHWAY_NOT_FOUND");
        verifyNoInteractions(f.receipts,f.store);
    }
    @Test void R01_wrongRoleAndForeignTenantNeverReadLearnerOrReceipt() {
        when(f.actors.require()).thenReturn(new Actor(ReviewFixture.ORG,ReviewFixture.LEARNER,Role.EMPLOYEE));
        assertThatThrownBy(()->f.review.detail(ReviewFixture.ID)).hasMessage("FORBIDDEN");verifyNoInteractions(f.store,f.receipts);
        var foreign=new Actor(new UUID(0,999),ReviewFixture.EXPERT,Role.DOMAIN_EXPERT);when(f.actors.require()).thenReturn(foreign);
        when(f.assignments.require(foreign,ReviewFixture.ID)).thenThrow(new Failure(404,"PATHWAY_NOT_FOUND"));
        assertThatThrownBy(()->f.review.detail(ReviewFixture.ID)).hasMessage("PATHWAY_NOT_FOUND");verifyNoInteractions(f.store,f.receipts);
    }
    @Test void R01_queueFiltersAssignmentBeforePagingAndRejectsBadBounds() {
        when(f.store.assigned(ReviewFixture.ORG,Set.of(ReviewFixture.ID),0,20)).thenReturn(List.of(f.current));
        assertThat(f.review.queue(0,20)).singleElement().satisfies(s->assertThat(s.id()).isEqualTo(ReviewFixture.ID));
        var order=inOrder(f.assignments,f.store);order.verify(f.assignments).assignedPathways(f.actor);order.verify(f.store).assigned(ReviewFixture.ORG,Set.of(ReviewFixture.ID),0,20);
        assertThatThrownBy(()->f.review.queue(-1,20)).hasMessage("INVALID_PAGING");assertThatThrownBy(()->f.review.queue(0,101)).hasMessage("INVALID_PAGING");
    }
    @ParameterizedTest @ValueSource(strings={"APPROVED","ARCHIVED","STALE"})
    void R12_noneditableLifecycleDeniesIncludeRemoveMoveAndConfirm(String state) {
        f.current=f.request(Review.valueOf(state),f.revision);
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"locked-include",f.edit("M-B"),true)).hasMessage("STALE_REVISION");
        assertThatThrownBy(()->f.review.remove(ReviewFixture.ID,"locked-remove",f.edit("M-A"))).hasMessage("STALE_REVISION");
        assertThatThrownBy(()->f.review.move(ReviewFixture.ID,"locked-move",new InitialPathwayReview.Move("M-A","UP",4L,f.revision.contentHash(),null))).hasMessage("STALE_REVISION");
        assertThatThrownBy(()->f.review.confirm(ReviewFixture.ID,"locked-confirm",f.expected())).hasMessage("STALE_REVISION");assertThat(f.history).hasSize(1);
    }
    @Test void G11_selectionDriftDeniesEvenCurrentNoop() {
        when(f.coordination.current(f.scope)).thenReturn(Optional.of(new Selection(new UUID(0,900),2,"other-role","level-test")));
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"drift",f.edit("M-A"),true)).hasMessage("STALE_SELECTION");assertThat(f.savedReceipts).isEmpty();
    }
    @Test void R11_sourceOutageDoesNotPrepareAnyWrite() {
        doThrow(new Failure(503,"CATALOG_UNAVAILABLE")).when(f.bindings).assertCurrent(f.scope,f.binding);
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"outage",f.edit("M-B"),true)).hasMessage("CATALOG_UNAVAILABLE");
        assertThat(f.history).hasSize(1);assertThat(f.savedReceipts).isEmpty();
    }
    @Test void R14_boundaryNonmemberAndInvalidDirectionLeaveStateUntouched() {
        assertThatThrownBy(()->f.review.move(ReviewFixture.ID,"boundary",new InitialPathwayReview.Move("M-A","UP",4L,f.revision.contentHash(),null))).hasMessage("MOVE_OUT_OF_RANGE");
        assertThatThrownBy(()->f.review.move(ReviewFixture.ID,"absent",new InitialPathwayReview.Move("M-B","DOWN",4L,f.revision.contentHash(),null))).hasMessage("MODULE_NOT_IN_DRAFT");
        assertThatThrownBy(()->f.review.move(ReviewFixture.ID,"invalid",new InitialPathwayReview.Move("M-A","SIDEWAYS",4L,f.revision.contentHash(),null))).hasMessage("INVALID_REQUEST");
        assertThat(f.history).hasSize(1);assertThat(f.savedReceipts).isEmpty();
    }
    @Test void R04_invalidExpectedTupleReasonAndKeyNeverWrite() {
        for(var expected:List.of(new InitialPathwayReview.Expected(null,f.revision.contentHash()),new InitialPathwayReview.Expected(0L,f.revision.contentHash()),new InitialPathwayReview.Expected(4L,"A".repeat(64))))
            assertThatThrownBy(()->f.review.confirm(ReviewFixture.ID,"invalid-tuple",expected)).hasMessage("INVALID_REQUEST");
        for(String key:List.of(""," leading","x".repeat(129)))assertThatThrownBy(()->f.review.confirm(ReviewFixture.ID,key,f.expected())).hasMessage("INVALID_IDEMPOTENCY_KEY");
        assertThatThrownBy(()->f.review.edit(ReviewFixture.ID,"long-reason",new InitialPathwayReview.Edit("M-B",4L,f.revision.contentHash(),"x".repeat(2001)),true)).hasMessage("INVALID_REQUEST");
        assertThat(f.savedReceipts).isEmpty();assertThat(f.history).hasSize(1);
    }
    @Test void R12_generationWithoutProposalCannotBeReadAsEditableDraft() {
        f.current=new com.adaptlearngraph.pathway.application.InitialPathwayStore.Request(ReviewFixture.ID,f.scope,f.selection,f.frozen,Generation.UNRESOLVED,"NO_PROVIDER",Review.NONE,null,null,null);
        assertThatThrownBy(()->f.review.detail(ReviewFixture.ID)).hasMessage("PROPOSAL_NOT_AVAILABLE");
        verify(f.store,never()).revision(any(),any(),anyLong());assertThat(f.savedReceipts).isEmpty();
    }
    @Test void R14_rejectedPrerequisiteInversionCallsNoRevisionApprovalOrReceiptWriter() {
        var provider=new Offer("M-P","Provider P","content-1",java.math.BigDecimal.TEN,java.math.BigDecimal.ONE,"P",null,0,true,"v1","fixture",TeachingFocus.PRIMARY,Difficulty.LOW,Difficulty.LOW,CoverageRole.ANCILLARY,false,null);
        f.problem=new Problem(List.of(f.problem.needs().getFirst(),new Need("P",true,null,"NO_ORIGINAL_EVIDENCE")),
                List.of(new Edge("S","P",new java.math.BigDecimal("0.7"))),List.of(ReviewFixture.offer("M-A"),provider),
                List.of(new GateDefinition("M-A","S","P","gate-SP","v1",null)),Set.of(),f.binding.versions());
        var plan=new com.adaptlearngraph.recommendation.domain.InitialPathwayPlanner().review(f.problem,Set.of("M-P","M-A"),10000);
        assertThat(plan.valid()).isTrue();
        f.revision=new com.adaptlearngraph.pathway.application.InitialPathwayStore.Revision(ReviewFixture.ID,4,f.revision.runId(),plan,
                Set.of("M-P","M-A"),List.of(),com.adaptlearngraph.pathway.application.InitialPathwayStore.Revision.identity(plan,Set.of("M-P","M-A"),List.of()),Validation.VALID);
        f.history.set(0,f.revision);f.current=f.request(Review.AWAITING_EXPERT_REVIEW,f.revision);
        var before=f.current;var old=f.revision;
        assertThatThrownBy(()->f.review.move(ReviewFixture.ID,"inversion",new InitialPathwayReview.Move("M-A","UP",4L,old.contentHash(),null)))
                .isInstanceOfSatisfying(InitialReviewOrder.Rejected.class,e->assertThat(e.diagnostics()).containsExactly("PREREQUISITE_ORDER:M-P:M-A:P"));
        assertThat(f.current).isSameAs(before);assertThat(f.revision).isSameAs(old);assertThat(f.history).containsExactly(old);assertThat(f.savedReceipts).isEmpty();
        verify(f.store,never()).saveRevision(any(),any(),any(),any(),any(),any(),any(),any());
        verify(f.store,never()).approve(any(),any(),any(),any());verify(f.receipts,never()).save(any(),any(),any(),any(),any());
    }
}
