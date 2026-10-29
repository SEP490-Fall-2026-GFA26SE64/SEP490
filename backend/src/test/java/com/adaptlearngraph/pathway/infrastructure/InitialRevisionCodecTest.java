package com.adaptlearngraph.pathway.infrastructure;

import static org.assertj.core.api.Assertions.*;
import com.adaptlearngraph.pathway.application.ReviewFixture;
import com.adaptlearngraph.pathway.application.InitialPathwayStore.Revision;
import com.adaptlearngraph.pathway.domain.InitialPathwayState.Validation;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.*;
import com.adaptlearngraph.recommendation.domain.InitialPlanning.Module;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;

class InitialRevisionCodecTest {
    final ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    final InitialRevisionCodec codec=new InitialRevisionCodec(json);
    @Test void P19_legacyLiteralRemainsFormat1WithoutRelabelingOrContentSubstitution() {
        String wire="""
          {"requestId":"00000000-0000-0000-0000-000000000104","revision":1,"runId":"00000000-0000-0000-0000-000000000106",
          "plan":{"modules":[{"id":"OLD","title":"Original title","contentVersion":"old-content-1","durationMinutes":10,"priceVnd":1,"ordinal":1,
          "targets":[{"moduleId":"OLD","title":"Original title","contentVersion":"old-content-1","durationMinutes":10,"priceVnd":1,"skillId":"S",
          "instructionLevel":"FOUNDATIONAL","preference":0,"foundationalSuitable":true,"suitabilityVersion":"old-policy","reason":"Original reason"}]}],
          "dependencies":[],"diagnostics":[],"sourcePins":{"catalog":"old-v1"}},"selectedModules":["OLD"],"overrides":[],"contentHash":"legacy-fixture-hash","validation":"VALID"}
          """;
        var decoded=codec.decode(wire,Revision.class);
        assertThat(decoded.plan().formatVersion()).isNull();assertThat(decoded.contentHash()).isEqualTo("legacy-fixture-hash");
        assertThat(decoded.plan().modules().getFirst().contentVersion()).isEqualTo("old-content-1");
        var target=decoded.plan().modules().getFirst().targets().getFirst();assertThat(target.instructionLevel()).isEqualTo(InstructionLevel.FOUNDATIONAL);
        assertThat(target.teachingFocus()).isNull();assertThat(target.difficultyLevel()).isNull();
        assertThat(codec.decode(codec.encode(decoded),Revision.class)).isEqualTo(decoded);
    }
    @Test void P19_format2RoundTripPreservesIdentityAndRejectsUnknownOrMixedEnvelopes() throws Exception {
        var revision=new ReviewFixture().revision;String wire=codec.encode(revision);
        assertThat(json.readTree(wire).path("formatVersion").asInt()).isEqualTo(2);
        assertThat(codec.decode(wire,Revision.class)).isEqualTo(revision);
        assertThatThrownBy(()->codec.decode(wire.replace("\"formatVersion\":2","\"formatVersion\":3"),Revision.class)).hasMessage("Pathway record invalid");
        assertThatThrownBy(()->codec.decode(json.writeValueAsString(revision),Revision.class)).hasMessage("Pathway record invalid");
        var root=json.readTree(wire);((com.fasterxml.jackson.databind.node.ObjectNode)root).put("extra",true);
        assertThatThrownBy(()->codec.decode(root.toString(),Revision.class)).hasMessage("Pathway record invalid");
    }
    @Test void P19_materialOrderOverridesAndContentAffectIdentityButSearchCountersDoNot() {
        var base=new ReviewFixture().revision;var plan=base.plan();
        assertThat(Revision.identity(plan.searched(new Search("FIXED_SET",true,"NOT_APPLICABLE",999)),base.selectedModules(),base.overrides())).isEqualTo(base.contentHash());
        assertThat(Revision.identity(plan,base.selectedModules(),List.of(List.of("REMOVE","M-B","reason")))).isNotEqualTo(base.contentHash());
        var m=plan.modules().getFirst();var changed=new Module(m.id(),m.title(),"content-2",BigDecimal.TEN,BigDecimal.ONE,1,m.targets());
        var changedPlan=new Plan(List.of(changed),plan.dependencies(),plan.diagnostics(),plan.sourcePins(),2,plan.warnings(),plan.quality(),plan.search(),plan.needs());
        assertThat(Revision.identity(changedPlan,base.selectedModules(),base.overrides())).isNotEqualTo(base.contentHash());
        var ordinal=new Module(m.id(),m.title(),m.contentVersion(),m.durationMinutes(),m.priceVnd(),2,m.targets());
        var ordered=new Plan(List.of(ordinal),plan.dependencies(),plan.diagnostics(),plan.sourcePins(),2,plan.warnings(),plan.quality(),plan.search(),plan.needs());
        assertThat(Revision.identity(ordered,base.selectedModules(),base.overrides())).isNotEqualTo(base.contentHash());
    }
}
