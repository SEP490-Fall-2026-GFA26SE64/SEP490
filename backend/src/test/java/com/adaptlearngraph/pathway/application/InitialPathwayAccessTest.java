package com.adaptlearngraph.pathway.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.Review;
import org.junit.jupiter.api.*;

/** Hook policy only. No mounted content/start/segment production route is claimed. */
class InitialPathwayAccessTest {
    ReviewFixture f;Availability availability;LiveReadiness readiness;ContentAccess content;InitialPathwayAccess access;
    @BeforeEach void fixture(){f=new ReviewFixture();availability=mock(Availability.class);readiness=mock(LiveReadiness.class);content=mock(ContentAccess.class);
        when(f.actors.require()).thenReturn(new Actor(ReviewFixture.ORG,ReviewFixture.LEARNER,Role.EMPLOYEE));
        f.current=f.request(Review.APPROVED,f.revision);when(f.store.approved(f.scope,ReviewFixture.ID,4,f.revision.contentHash())).thenReturn(true);
        access=new InitialPathwayAccess(f.actors,f.coordination,f.store,f.assignments,f.bindings,availability,readiness,content);}
    @Test void E08_missingOwnerCapabilityNeverReturnsLearningEntry() {
        assertThatThrownBy(()->access.requireEntry(ReviewFixture.ID,"M-A")).hasMessage("CONTENT_ACCESS_UNAVAILABLE");
        verify(f.assignments).requireApprovalValid(f.scope,ReviewFixture.ID,4,f.revision.contentHash());
        verify(f.bindings).assertCurrent(f.scope,f.binding);
    }
    @Test void E03_exactApprovalIsRequiredBeforeAnyAvailabilityOrContentOwnerCall() {
        when(f.store.approved(f.scope,ReviewFixture.ID,4,f.revision.contentHash())).thenReturn(false);
        assertThatThrownBy(()->access.requireEntry(ReviewFixture.ID,"M-A")).hasMessage("PATHWAY_NOT_APPROVED");verifyNoInteractions(availability,readiness,content);
    }
    @Test void E07_archivedAndDraftCannotGrantCurrentEntry() {
        for(var lifecycle:java.util.List.of(Review.ARCHIVED,Review.AWAITING_EXPERT_REVIEW)) {
            f.current=f.request(lifecycle,f.revision);assertThatThrownBy(()->access.requireEntry(ReviewFixture.ID,"M-A")).hasMessage("PATHWAY_NOT_APPROVED");
        }
        verifyNoInteractions(availability,readiness,content);
    }
    @Test void E08_liveRevocationAndAvailabilityOutageDenyWithoutReceiptOrRevisionWrite() {
        doThrow(new Failure(403,"PATHWAY_APPROVAL_INVALID")).when(f.assignments).requireApprovalValid(any(),any(),anyLong(),anyString());
        assertThatThrownBy(()->access.requireEntry(ReviewFixture.ID,"M-A")).hasMessage("PATHWAY_APPROVAL_INVALID");verifyNoInteractions(content);
        doNothing().when(f.assignments).requireApprovalValid(any(),any(),anyLong(),anyString());
        doThrow(new Failure(503,"CONTENT_UNAVAILABLE")).when(availability).requireAvailable(any(),any(),any());
        assertThatThrownBy(()->access.requireEntry(ReviewFixture.ID,"M-A")).hasMessage("CONTENT_UNAVAILABLE");
        assertThat(f.history).hasSize(1);assertThat(f.savedReceipts).isEmpty();
    }
    @Test void E09_publicExternalOrMalformedOwnerEntryIsRejected() {
        for(String entry:java.util.List.of("https://public.example/asset","//external/asset","/bad\\asset")) {
            when(content.requireEntry(any(),any(),any(),any())).thenReturn(entry);
            assertThatThrownBy(()->access.requireEntry(ReviewFixture.ID,"M-A")).hasMessage("CONTENT_ACCESS_UNAVAILABLE");
        }
    }
}
