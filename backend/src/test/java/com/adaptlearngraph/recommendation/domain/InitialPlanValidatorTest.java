package com.adaptlearngraph.recommendation.domain;

import static org.assertj.core.api.Assertions.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class InitialPlanValidatorTest {
    static Offer offer(String module,String skill,TeachingFocus focus,int preference) {
        return new Offer(module,"Module "+module,"content-1",BigDecimal.TEN,BigDecimal.ONE,skill,null,preference,true,
                "suitability-1","independent fixture",focus,Difficulty.LOW,Difficulty.LOW,CoverageRole.ANCILLARY,false,null);
    }
    static Problem problem(List<Need> needs,List<Edge> edges,List<Offer> offers,List<GateDefinition> gates,Set<String> external) {
        return new Problem(needs,edges,offers,gates,external,Map.of("catalog","test-release","readiness","readiness-1"));
    }
    static final Edge EDGE=new Edge("D","P",new BigDecimal("0.7"));
    static GateDefinition gate(String module,String internal) { return new GateDefinition(module,"D","P","definition-1","readiness-1",internal); }
    final InitialPathwayPlanner planner=new InitialPathwayPlanner();
    @Test void R14_andPrerequisitesRequireBothProvidersInIndependentExpectedOrder() {
        var d=offer("M-D","D",TeachingFocus.PRIMARY,0);var p=offer("M-P","P",TeachingFocus.PRIMARY,0);var q=offer("M-Q","Q",TeachingFocus.PRIMARY,0);
        var pbl=problem(List.of(new Need("D",true),new Need("P",true),new Need("Q",true)),List.of(EDGE,new Edge("D","Q",BigDecimal.ONE)),
                List.of(d,p,q),List.of(gate("M-D",null),new GateDefinition("M-D","D","Q","definition-2","readiness-1",null)),Set.of());
        var plan=planner.review(pbl,Set.of("M-D","M-P","M-Q"),1000);
        assertThat(plan.valid()).isTrue();
        assertThat(plan.modules()).extracting(InitialPlanning.Module::id).containsExactly("M-P","M-Q","M-D");
        assertThat(plan.dependencies()).extracting(Dependency::providerModuleId).containsExactly("M-P","M-Q");
    }
    @Test void R06_removingSoleProviderRetainsDependentAsUnresolvedWithoutAutoRepair() {
        var pbl=problem(List.of(new Need("D",true),new Need("P",true)),List.of(EDGE),List.of(offer("M-D","D",TeachingFocus.PRIMARY,0),offer("M-P","P",TeachingFocus.PRIMARY,0)),List.of(gate("M-D",null)),Set.of());
        var plan=planner.review(pbl,Set.of("M-D"),1000);
        assertThat(plan.valid()).isFalse();assertThat(plan.diagnostics()).contains("MISSING_PROVIDER:P","UNPLANNED_PREREQUISITE:P");
        assertThat(plan.modules()).extracting(InitialPlanning.Module::id).containsExactly("M-D");
        assertThat(planner.review(pbl,Set.of("M-D","M-P"),1000).valid()).isTrue();
    }
    @Test void P07_externalEvidenceRequiresExactGateButNoInventedProvider() {
        var d=offer("M-D","D",TeachingFocus.PRIMARY,0);
        var pbl=problem(List.of(new Need("D",false)),List.of(EDGE),List.of(d),List.of(gate("M-D",null)),Set.of("P"));
        var result=planner.review(pbl,Set.of("M-D"),100);
        assertThat(result.valid()).isTrue();assertThat(result.dependencies()).singleElement().satisfies(g->assertThat(g.providerModuleId()).isNull());
        var missing=problem(pbl.needs(),pbl.edges(),pbl.offers(),List.of(),pbl.externallyReadySkills());
        assertThat(planner.review(missing,Set.of("M-D"),100).valid()).isFalse();
    }
    @Test void P10_internalCoverageRequiresDefinedSegmentGate() {
        var offers=List.of(offer("M-BOTH","D",TeachingFocus.PRIMARY,0),offer("M-BOTH","P",TeachingFocus.SUPPORTING,0));
        var pbl=problem(List.of(new Need("D",true),new Need("P",true)),List.of(EDGE),offers,List.of(gate("M-BOTH","segment-gate")),Set.of());
        var plan=planner.review(pbl,Set.of("M-BOTH"),1000);assertThat(plan.valid()).isTrue();
        assertThat(plan.dependencies()).singleElement().satisfies(g->assertThat(g.internalGateId()).isEqualTo("segment-gate"));
        assertThat(plan.quality().moduleCount()).isEqualTo(1);assertThat(plan.quality().durationMinutes()).isEqualByComparingTo("10");
        var missing=problem(pbl.needs(),pbl.edges(),offers,List.of(gate("M-BOTH",null)),Set.of());
        assertThat(planner.review(missing,Set.of("M-BOTH"),1000).valid()).isFalse();
    }
    @Test void R14_primaryExclusionDoesNotFabricateSupportingPermission() {
        var pbl=problem(List.of(new Need("S",true)),List.of(),List.of(offer("M-A","S",TeachingFocus.PRIMARY,0),offer("M-B","S",TeachingFocus.SUPPORTING,0),offer("M-B","X",TeachingFocus.PRIMARY,0)),List.of(),Set.of());
        var plan=planner.review(pbl,Set.of("M-B"),1000);
        assertThat(plan.valid()).isFalse();assertThat(plan.diagnostics()).contains("MISSING_PROVIDER:S");
    }
    @Test void R14_fixedSetRetainsExtraExpertChoiceAndAdvisoryFallbackWarnings() {
        var pbl=problem(List.of(new Need("S",true)),List.of(),List.of(offer("M-A","S",TeachingFocus.PRIMARY,1),offer("M-B","S",TeachingFocus.PRIMARY,2)),List.of(),Set.of());
        var plan=planner.review(pbl,Set.of("M-A","M-B"),1000);
        assertThat(plan.valid()).isTrue();assertThat(plan.modules()).extracting(InitialPlanning.Module::id).containsExactly("M-A","M-B");
        assertThat(plan.warnings()).isNotEmpty();assertThat(plan.search().scope()).isEqualTo("FIXED_SET");
        assertThat(plan.quality().durationMinutes()).isEqualByComparingTo("20");
    }
    @Test void P18_searchBudgetTerminatesWithoutApproximateValidSuccess() {
        var pbl=problem(List.of(new Need("S",true)),List.of(),List.of(offer("M-A","S",TeachingFocus.PRIMARY,0),offer("M-B","S",TeachingFocus.PRIMARY,0)),List.of(),Set.of());
        var limited=planner.review(pbl,Set.of("M-A"),1);
        assertThat(limited.valid()).isFalse();assertThat(limited.diagnostics()).contains("SEARCH_LIMIT");
        assertThat(limited.search().visitedStates()).isLessThanOrEqualTo(1);assertThat(limited.search().complete()).isFalse();
        var proven=planner.review(pbl,Set.of("M-A"),1000);assertThat(proven.valid()).isTrue();assertThat(proven.search().visitedStates()).isLessThanOrEqualTo(1000);
    }
    @Test void R08_skillCycleCannotBeConfirmedEvenIfEverySkillHasProvider() {
        var pbl=problem(List.of(new Need("D",true),new Need("P",true)),List.of(EDGE,new Edge("P","D",BigDecimal.ONE)),List.of(offer("M-D","D",TeachingFocus.PRIMARY,0),offer("M-P","P",TeachingFocus.PRIMARY,0)),List.of(gate("M-D",null)),Set.of());
        var result=planner.review(pbl,Set.of("M-D","M-P"),1000);
        assertThat(result.valid()).isFalse();assertThat(result.diagnostics()).contains("SKILL_DEPENDENCY_CYCLE");
    }
    @Test void P18_boundedThirtySampleReviewMeasurementHasNoLatencySla() {
        var pbl=problem(List.of(new Need("S",true)),List.of(),List.of(offer("M-A","S",TeachingFocus.PRIMARY,0),offer("M-B","S",TeachingFocus.PRIMARY,0)),List.of(),Set.of());
        for(int i=0;i<10;i++)planner.review(pbl,Set.of("M-A"),1000);
        long[] nanos=new long[30];long visited=0;
        for(int i=0;i<nanos.length;i++){long start=System.nanoTime();var result=planner.review(pbl,Set.of("M-A"),1000);nanos[i]=System.nanoTime()-start;
            assertThat(result.valid()).isTrue();assertThat(result.search().visitedStates()).isLessThanOrEqualTo(1000);visited=result.search().visitedStates();}
        Arrays.sort(nanos);
        System.out.printf(Locale.ROOT,"C3 bounded measurement: needs=1 providers=2 selected=1 edges=0 budget=1000 warmup=10 samples=30 threads=1 visited=%d p50_us=%.3f p95_us=%.3f; no SLA/p99/resource claim%n",visited,nanos[14]/1000.0,nanos[28]/1000.0);
    }
}
