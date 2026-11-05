package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.InitialPlanning.*;
import com.adaptlearngraph.entities.domain.InitialSuitability;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SingleSkillPlanningTest {
    Offer offer(String module,String skill,int duration) {
        return new Offer(module,module,"content",BigDecimal.valueOf(duration),BigDecimal.ONE,skill,null,0,true,
                InitialSuitability.SINGLE_SKILL_VERSION,"SINGLE_SKILL_COVERAGE",null,null,null,CoverageRole.ANCILLARY,false,null);
    }
    @Test void singleSkillCoverageNeedsNoFocusOrDifficultyAndKeepsExistingCostOrdering() {
        var a=offer("a","skill",10);var b=offer("b","skill",5);
        var problem=new Problem(List.of(new Need("skill",false)),List.of(),List.of(a,b),List.of(),Set.of(),Map.of());
        var plan=new InitialPathwayPlanner().generate(problem,1000);
        assertTrue(plan.valid(),plan.diagnostics().toString());assertEquals(1,plan.modules().size());assertEquals("b",plan.modules().getFirst().id());
        var target=plan.modules().getFirst().targets().getFirst();assertNull(target.teachingFocus());assertNull(target.difficultyLevel());
        assertNull(target.preferredDifficulty());assertFalse(target.expertAttention());assertEquals(CoverageRole.COVERAGE,target.coverageRole());
    }
    @Test void newPolicyRejectsMultipleTargetsForOneModuleWithoutChangingHistoricalPolicy() {
        var a=offer("same","a",5);var b=offer("same","b",5);
        var p=new Problem(List.of(new Need("a",false),new Need("b",false)),List.of(),List.of(a,b),List.of(),Set.of(),Map.of());
        var result=new InitialPlanValidator().validate(p,Map.of("a",a,"b",b),Set.of("same"));
        assertFalse(result.valid());assertTrue(result.diagnostics().contains("MODULE_SKILL_CARDINALITY_INVALID:same"));
    }
}
