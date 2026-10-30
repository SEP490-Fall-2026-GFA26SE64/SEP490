package com.adaptlearngraph.pathway.application;

import static org.assertj.core.api.Assertions.*;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.Revision;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.Validation;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Module;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class InitialReviewOrderTest {
    static Plan plan(List<String> ids, List<Dependency> gates) {
        var modules=new ArrayList<Module>();
        for(String id:ids)modules.add(new Module(id,"Title "+id,"content-1",BigDecimal.TEN,BigDecimal.ONE,modules.size()+1,List.of()));
        return new Plan(modules,gates,List.of(),Map.of("catalog","test-catalog"));
    }
    static Revision revision(Plan p, boolean explicit) {
        return new Revision(new UUID(0,1),4,new UUID(0,2),p,new HashSet<>(InitialReviewOrder.ids(p)),
                explicit?List.of(List.of("MOVE_UP","B","saved")):List.of(),"a".repeat(64),Validation.VALID);
    }
    static Dependency dependency(String provider,String dependent) {
        return new Dependency(dependent,"skill-dependent","skill-prerequisite",provider,"gate-1","readiness-1",null);
    }
    @Test void R03_adjacentMoveAndInversePreserveAllOtherPositions() {
        var original=plan(List.of("A","B","C","D"),List.of());
        var moved=InitialReviewOrder.move(original,revision(original,false),"C",true);
        assertThat(InitialReviewOrder.ids(moved)).containsExactly("A","C","B","D");
        assertThat(moved.modules()).extracting(Module::ordinal).containsExactly(1,2,3,4);
        assertThat(InitialReviewOrder.ids(InitialReviewOrder.move(moved,revision(moved,true),"C",false)))
                .containsExactly("A","B","C","D");
        assertThat(InitialReviewOrder.ids(original)).containsExactly("A","B","C","D");
    }
    @Test void R05_boundaryAndNonmemberMovesAreRejected() {
        var p=plan(List.of("A","B"),List.of());
        assertThatThrownBy(()->InitialReviewOrder.move(p,revision(p,false),"A",true)).isInstanceOf(InitialPathwayPorts.Failure.class).hasMessage("MOVE_OUT_OF_RANGE");
        assertThatThrownBy(()->InitialReviewOrder.move(p,revision(p,false),"B",false)).hasMessage("MOVE_OUT_OF_RANGE");
        assertThatThrownBy(()->InitialReviewOrder.move(p,revision(p,false),"foreign",true)).hasMessage("MODULE_NOT_IN_DRAFT");
    }
    @Test void R14_providerInversionReportsExactDependencyAndLeavesOriginalOrder() {
        var p=plan(List.of("P","D","I"),List.of(dependency("P","D")));
        assertThatThrownBy(()->InitialReviewOrder.move(p,revision(p,false),"D",true))
                .isInstanceOfSatisfying(InitialReviewOrder.Rejected.class,e->assertThat(e.diagnostics())
                        .containsExactly("PREREQUISITE_ORDER:P:D:skill-prerequisite"));
        assertThat(InitialReviewOrder.ids(p)).containsExactly("P","D","I");
    }
    @Test void R09_checkRetainsSavedOrderAndDependencies() {
        var saved=plan(List.of("C","A","B"),List.of(dependency("A","B")));
        var fresh=plan(List.of("A","B","C"),saved.dependencies());
        var kept=InitialReviewOrder.retain(fresh,revision(saved,true),false);
        assertThat(InitialReviewOrder.ids(kept)).containsExactly("C","A","B");
        assertThat(kept.dependencies()).isEqualTo(saved.dependencies());
        assertThat(kept.diagnostics()).isEmpty();
        assertThat(InitialReviewOrder.ids(InitialReviewOrder.retain(fresh,revision(saved,false),false))).containsExactly("A","B","C");
    }
    @Test void R14_newMultihopPrerequisitesInsertBeforeDependentPreservingIndependentOrder() {
        var old=plan(List.of("D","I","J"),List.of());
        var fresh=plan(List.of("I","J","P","Q","D"),List.of(dependency("P","Q"),dependency("Q","D")));
        var repaired=InitialReviewOrder.retain(fresh,revision(old,true),true);
        assertThat(InitialReviewOrder.ids(repaired)).containsExactly("P","Q","D","I","J");
        assertThat(repaired.valid()).isTrue();
    }
    @Test void R14_externalAndInternalGatesDoNotInventOrdinalDependencies() {
        var p=plan(List.of("D","I"),List.of(dependency(null,"D"),dependency("D","D")));
        assertThat(InitialReviewOrder.ids(InitialReviewOrder.move(p,revision(p,false),"I",true))).containsExactly("I","D");
    }
    @Test void R14_changedMembershipCannotSilentlyTurnMoveIntoAnotherOrder() {
        var old=plan(List.of("A","B"),List.of());
        assertThatThrownBy(()->InitialReviewOrder.move(plan(List.of("A","B","C"),List.of()),revision(old,false),"B",true)).hasMessage("VALIDATION_CHANGED");
    }
}
