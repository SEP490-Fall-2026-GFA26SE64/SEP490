package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.RuleAssessment.*;
import com.adaptlearngraph.entities.domain.RuleAssessmentDecision.State;
import com.adaptlearngraph.repository.RulePathwayCatalog;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Lower-layer assertions only. These do not establish the complete spreadsheet cases or UI/CI acceptance. */
class WF05RuleDomainTest {
    @Test @org.junit.jupiter.api.Tag("wf05-feature") @DisplayName("FR-06.08-U01: later evidence enables a fresh paper, never repairs a failed frozen prerequisite")
    void laterEvidenceDoesNotReplayFailedPaper(){
        var main=group("A",GroupRole.MAIN,false);var pre=group("B",GroupRole.PREREQUISITE,false);
        var failed=score(main,pre,2,1);
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT,failed,Set.of(),Set.of(req("B").key()),false).state()).isEqualTo(State.WAITING_SUPPLEMENT);
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT,score(main,pre,2,2),Set.of(),Set.of(req("B").key()),false).state()).isEqualTo(State.READY);
        assertThat(failed.stream().filter(r->r.role()==GroupRole.PREREQUISITE).findFirst().orElseThrow().passed()).isFalse();
    }
    static final KnowledgeLevel LEVEL=KnowledgeLevel.FOUNDATION;
    static final Instant NOW=Instant.parse("2026-11-16T00:00:00Z");
    static Requirement req(String id){return new Requirement(id,LEVEL,List.of("OUT-1"));}
    static Candidate item(Requirement r,boolean mandatory){return new Candidate(UUID.randomUUID(),r,"OUT-1",mandatory,
        "Question",List.of(new Option("A","Correct"),new Option("B","Incorrect")),"A","content-v1","mapping-v1");}
    static Group group(String id,GroupRole role,boolean veto){var r=req(id);return new Group(UUID.randomUUID(),r,role,
        new GroupRule(id,LEVEL,2,2,false,veto,0),List.of(item(r,false),item(r,false)));}
    static Map<UUID,String> answers(Group g,int correct){var result=new HashMap<UUID,String>();
        for(int i=0;i<g.items().size();i++)result.put(g.items().get(i).itemVersionId(),i<correct?"A":"B");return result;}
    static List<GroupResult> score(Group main,Group pre,int mainCorrect,int preCorrect){var a=answers(main,mainCorrect);a.putAll(answers(pre,preCorrect));
        return RuleAssessment.score(new Paper(Purpose.SKILL_ASSESSMENT,List.of(main,pre),NOW,NOW.plusSeconds(60)),a);}
    @Test @DisplayName("WF05 regression: domain: baseline remains diagnostic even when all targets pass")
    void baselineDoesNotBecomeOfficialQualification(){var g=group("A",GroupRole.TARGET,false);
        var paper=new Paper(Purpose.BASELINE,List.of(g),NOW,NOW.plusSeconds(60));
        assertThat(RuleAssessmentDecision.decide(Purpose.BASELINE,RuleAssessment.score(paper,answers(g,2)),Set.of(),Set.of(),false).state()).isEqualTo(State.BASELINE_RECORDED);
        assertThat(RuleAssessment.score(paper,Map.of()).getFirst().correctCount()).isZero();}
    @Test @DisplayName("WF05 regression: domain: MAIN failure cannot be offset by a passing prerequisite")
    void mainFailure(){var m=group("A",GroupRole.MAIN,false);var p=group("B",GroupRole.PREREQUISITE,false);
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT,score(m,p,1,2),Set.of(),Set.of(),false).state()).isEqualTo(State.MAIN_FAILED);}
    @Test @DisplayName("WF05 regression: domain: all-wrong veto requires retake despite existing official proof")
    void veto(){var m=group("A",GroupRole.MAIN,false);var p=group("B",GroupRole.PREREQUISITE,true);
        var d=RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT,score(m,p,2,0),Set.of(req("B").key()),Set.of(req("B").key()),false);
        assertThat(d.state()).isEqualTo(State.VETO_RETAKE_REQUIRED);assertThat(d.reviews()).hasSize(1);assertThat(d.supplements()).isEmpty();}
    @Test @DisplayName("WF05 regression: domain: non-veto shortage waits for genuine compatible supplementation")
    void shortage(){var m=group("A",GroupRole.MAIN,false);var p=group("B",GroupRole.PREREQUISITE,false);var results=score(m,p,2,1);
        var waiting=RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT,results,Set.of(),Set.of(),false);
        assertThat(waiting.state()).isEqualTo(State.WAITING_SUPPLEMENT);assertThat(waiting.supplements()).extracting(r->r.requirement().skillId()).containsExactly("B");
    }
    @Test @DisplayName("WF05 regression: domain: full retake has no carried group answers")
    void fullRetake(){var m=group("A",GroupRole.MAIN,false);var p=group("B",GroupRole.PREREQUISITE,false);
        assertThat(score(m,p,2,2)).allMatch(GroupResult::passed);
        var retake=new Paper(Purpose.SKILL_ASSESSMENT,List.of(group("A",GroupRole.MAIN,false),group("B",GroupRole.PREREQUISITE,false)),NOW,NOW.plusSeconds(60));
        assertThat(RuleAssessment.score(retake,Map.of())).allMatch(r->r.correctCount()==0&&!r.passed());}
    @Test @DisplayName("WF05 regression: domain: prior official proof produces NEED_REVIEW input without revocation")
    void priorOfficialReview(){var m=group("A",GroupRole.MAIN,false);var p=group("B",GroupRole.PREREQUISITE,false);var official=Set.of(req("B").key());
        var d=RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT,score(m,p,2,1),official,official,false);
        assertThat(d.reviews()).hasSize(1);assertThat(d.supplements()).isEmpty();assertThat(official).containsExactly(req("B").key());}
    @Test @DisplayName("WF05 regression: domain: passing B on A retake does not clear assigned B learning")
    void assignedLearningStillBlocks(){var m=group("A",GroupRole.MAIN,false);var p=group("B",GroupRole.PREREQUISITE,false);
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT,score(m,p,2,2),Set.of(),Set.of(),true).state()).isEqualTo(State.WAITING_SUPPLEMENT);}
    static RequirementPathway.Requirement need(String id,RequirementPathway.Provision mode){return new RequirementPathway.Requirement(id,id,LEVEL,"v1",List.of("OUT-1"),mode);}
    static RequirementPathway.Option module(String id){return new RequirementPathway.Option(id,1,"content-v1",id,List.of("OUT-1"),"v1");}
    static RequirementPathway.Step step(RequirementPathway.Requirement r,RequirementPathway.Kind kind,RequirementPathway.State state){return new RequirementPathway.Step(UUID.randomUUID(),r,kind,
        kind==RequirementPathway.Kind.REQUIRED?null:UUID.randomUUID(),state,"Fixture",state==RequirementPathway.State.FULFILLED?UUID.randomUUID():null,
        r.provision()==RequirementPathway.Provision.MODULE_ONLY?List.of(module("M1")):List.of(),null);}
    @Test @DisplayName("WF05 regression: domain: preserve both eligible alternatives and exclusive certificate route")
    void generationAlternatives(){var a=need("A",RequirementPathway.Provision.MODULE_ONLY);var c=need("C",RequirementPathway.Provision.CERTIFICATE_ONLY);
        var cert=new RulePathwayCatalog.Certificate("C1","v1","Certificate","https://example.test/c",List.of("OUT-1"));
        var snapshot=new RulePathwayCatalog.Snapshot("catalog-v1",List.of(a,c),Map.of(a.key(),List.of(module("A1"),module("A2"))),Map.of(c.key(),cert));
        var first=RequirementPathwayGenerationService.step(UUID.randomUUID(),a,RequirementPathway.Kind.REQUIRED,null,snapshot,null);
        assertThat(first.options()).extracting(RequirementPathway.Option::moduleId).containsExactly("A1","A2");assertThat(first.certificate()).isNull();
        var second=RequirementPathwayGenerationService.step(UUID.randomUUID(),c,RequirementPathway.Kind.REQUIRED,null,snapshot,null);
        assertThat(second.options()).isEmpty();assertThat(second.certificate().id()).isEqualTo("C1");}
    @Test @DisplayName("WF05 regression: domain: removing all alternatives retains an unresolved required root")
    void emptyAlternativesNeedExpert(){var r=need("A",RequirementPathway.Provision.MODULE_ONLY);
        var root=new RequirementPathway.Step(UUID.randomUUID(),r,RequirementPathway.Kind.REQUIRED,null,RequirementPathway.State.NEEDS_EXPERT_ACTION,"No alternatives",null,List.of(),null);
        var plan=new RequirementPathway.Plan(List.of(root),List.of());assertThat(plan.readyForInitialApproval()).isFalse();assertThat(plan.targetReleased()).isFalse();}
    @Test @DisplayName("WF05 regression: domain: only unresolved REQUIRED work controls target release")
    void release(){var r=need("A",RequirementPathway.Provision.MODULE_ONLY);
        var pending=step(r,RequirementPathway.Kind.REQUIRED,RequirementPathway.State.NEEDS_SUPPLEMENTATION);
        assertThat(new RequirementPathway.Plan(List.of(pending),List.of()).targetReleased()).isFalse();
        var parallel=step(need("B",RequirementPathway.Provision.MODULE_ONLY),RequirementPathway.Kind.PARALLEL_SUPPLEMENT,RequirementPathway.State.NEEDS_SUPPLEMENTATION);
        var bypass=step(r,RequirementPathway.Kind.REQUIRED,RequirementPathway.State.BYPASSED);
        assertThat(new RequirementPathway.Plan(List.of(bypass,parallel),List.of()).targetReleased()).isTrue();assertThat(bypass.fulfilledEvidenceId()).isNull();
        assertThat(new RequirementPathway.Plan(List.of(step(r,RequirementPathway.Kind.REQUIRED,RequirementPathway.State.FULFILLED),parallel),List.of()).targetReleased()).isTrue();}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-F13 - Module and certificate provision are exclusive")
    void exclusiveProvision(){var r=need("A",RequirementPathway.Provision.MODULE_ONLY);
        assertThatThrownBy(()->new RequirementPathway.Step(UUID.randomUUID(),r,RequirementPathway.Kind.REQUIRED,null,RequirementPathway.State.NEEDS_SUPPLEMENTATION,"Invalid mixed",null,List.of(module("A1")),
            new RequirementPathway.CertificateReference("C","v1","Certificate","https://example.test/c"))).isInstanceOf(IllegalArgumentException.class);}
    @Test @DisplayName("WF05 regression: domain: evidence references require HTTPS without credentials")
    void https(){assertThat(HttpsReference.require("https://example.test/evidence")).isEqualTo("https://example.test/evidence");
        assertThatThrownBy(()->HttpsReference.require("http://example.test/evidence")).isInstanceOf(IllegalArgumentException.class);}
}
