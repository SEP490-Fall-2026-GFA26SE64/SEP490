package com.adaptlearngraph.pathway.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.pathway.application.InitialPlanningPorts.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;

class InitialProblemBuilderTest {
    ReviewFixture f;Graphs graphs;SuitabilityPolicy suitability;ReadinessDefinitions readiness;Availability available;InitialProblemBuilder builder;
    final Provider provider=new Provider("M-A","Module A","content-1",BigDecimal.TEN,BigDecimal.ONE,"S",TeachingFocus.PRIMARY,Difficulty.LOW);
    final Edge edge=new Edge("S","P",new BigDecimal("0.7"));
    @BeforeEach void fixture(){f=new ReviewFixture();graphs=mock(Graphs.class);suitability=mock(SuitabilityPolicy.class);readiness=mock(ReadinessDefinitions.class);available=mock(Availability.class);
        when(graphs.load(any(),any(),any(),any())).thenReturn(new Graph(Set.of("S","P"),List.of(edge),List.of(provider),"release-test"));
        when(suitability.evaluate(any(),any(),any(),any())).thenReturn(new Suitability(true,0,true,"v1","fixture"));
        when(available.available(any(),any(),any())).thenReturn(true);
        when(readiness.prerequisite(any(),any(),any())).thenReturn(new PrerequisiteNeed(false,false,"external-evidence-v1",new BigDecimal("0.7"),null));
        when(readiness.gate(any(),any(),any(),any())).thenReturn(Optional.of(new GateDefinition("M-A","S","P","gate","v1",null)));
        builder=new InitialProblemBuilder(graphs,suitability,readiness,available,f.limits);}
    @Test void P07_versionMatchedExternalEvidenceIsPinnedWithoutInventedProviderOrPass() {
        var problem=builder.build(f.scope,f.binding,f.gaps,"planning");assertThat(problem.externallyReadySkills()).containsExactly("P");
        assertThat(problem.needs()).extracting(Need::skillId).containsExactly("S");assertThat(problem.gates()).singleElement().satisfies(g->assertThat(g.internalGateId()).isNull());
        assertThat(problem.sourcePins().values()).contains("external-evidence-v1");verifyNoInteractions(f.store,f.receipts);
    }
    @Test void P10_mismatchedGateVersionFailsClosedAndMissingGateDoesNotInventInternalGate() {
        when(readiness.gate(any(),any(),any(),any())).thenReturn(Optional.of(new GateDefinition("M-A","S","P","gate","wrong-version","invented")));
        assertThatThrownBy(()->builder.build(f.scope,f.binding,f.gaps,"planning")).hasMessage("INCOHERENT_READINESS_DEFINITION");
        when(readiness.gate(any(),any(),any(),any())).thenReturn(Optional.empty());assertThat(builder.build(f.scope,f.binding,f.gaps,"planning").offers()).isEmpty();
    }
    @Test void P20_releaseMismatchAndPolicyMismatchCannotBecomeEligibleCandidate() {
        when(graphs.load(any(),any(),any(),any())).thenReturn(new Graph(Set.of("S","P"),List.of(edge),List.of(provider),"different-release"));
        assertThatThrownBy(()->builder.build(f.scope,f.binding,f.gaps,"planning")).hasMessage("INCOHERENT_CATALOG");
        when(graphs.load(any(),any(),any(),any())).thenReturn(new Graph(Set.of("S","P"),List.of(edge),List.of(provider),"release-test"));
        when(suitability.evaluate(any(),any(),any(),any())).thenReturn(new Suitability(true,0,true,"wrong-version","fixture"));
        assertThatThrownBy(()->builder.build(f.scope,f.binding,f.gaps,"planning")).hasMessage("INCOHERENT_POLICY");
    }
    @Test void P07_prerequisiteOwnUnknownEvidenceIsExplicitAndAvailabilityOutagePropagates() {
        when(readiness.prerequisite(any(),any(),any())).thenReturn(new PrerequisiteNeed(true,true,"unknown-evidence",null,"NO_ORIGINAL_EVIDENCE"));
        var result=builder.build(f.scope,f.binding,f.gaps,"planning");assertThat(result.needs()).filteredOn(n->n.skillId().equals("P")).singleElement().satisfies(n->{assertThat(n.mastery()).isNull();assertThat(n.unknownReason()).isEqualTo("NO_ORIGINAL_EVIDENCE");});
        when(available.available(any(),any(),any())).thenThrow(new Failure(503,"AVAILABILITY_UNAVAILABLE"));
        assertThatThrownBy(()->builder.build(f.scope,f.binding,f.gaps,"planning")).hasMessage("AVAILABILITY_UNAVAILABLE");
    }
}
