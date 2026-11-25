package com.adaptlearngraph.research;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.RequirementPathway;
import com.adaptlearngraph.entities.domain.RequirementPathway.Kind;
import com.adaptlearngraph.entities.domain.RequirementPathway.Plan;
import com.adaptlearngraph.entities.domain.RequirementPathway.Provision;
import com.adaptlearngraph.entities.domain.RequirementPathway.Requirement;
import com.adaptlearngraph.entities.domain.RequirementPathway.State;
import com.adaptlearngraph.entities.domain.RequirementPathway.Step;
import com.adaptlearngraph.entities.domain.RuleAssessment;
import com.adaptlearngraph.entities.domain.RuleAssessment.GroupResult;
import com.adaptlearngraph.entities.domain.RuleAssessment.GroupRole;
import com.adaptlearngraph.entities.domain.RuleAssessment.Purpose;
import com.adaptlearngraph.entities.domain.RuleAssessmentDecision;
import com.adaptlearngraph.repository.RulePathwayCatalog;
import com.adaptlearngraph.services.RequirementPathwayGenerationService;
import com.adaptlearngraph.services.RequirementPathwayPlanningService;
import com.adaptlearngraph.services.RequirementPathwayRecalculationService;
import com.adaptlearngraph.services.RequirementPathwayRecalculationService.FailedPrerequisite;
import java.util.*;
import org.junit.jupiter.api.Test;

/**
 * Traces the protocol branches on the runtime transitions the RQ3 simulator calls: supplementation
 * ({@link RequirementPathwayRecalculationService#supplement}) and the per-step refresh
 * ({@link RequirementPathwayGenerationService#step} + {@link RequirementPathwayPlanningService#refreshedStep}).
 */
class Rq3RuntimeTransitionTest {
    private static final UUID REQUEST = UUID.nameUUIDFromBytes("rq3-transition-request".getBytes());
    private static final Requirement A = requirement("A");
    private static final Requirement B = requirement("B");
    private static final Requirement C = requirement("C");
    private static final Requirement UNPROVIDED = requirement("NO-MODULE");

    private static Requirement requirement(String skill) {
        return new Requirement(skill, skill, KnowledgeLevel.FOUNDATION, "v1", List.of(), Provision.MODULE_ONLY);
    }

    private static RequirementPathway.Option module(String skill) {
        return new RequirementPathway.Option("M-" + skill, 1, "v1", "Module " + skill, List.of(), "v1");
    }

    private static final RulePathwayCatalog.Snapshot CATALOG = new RulePathwayCatalog.Snapshot("test",
            List.of(A, B, C, UNPROVIDED),
            Map.of(A.key(), List.of(module("A")), B.key(), List.of(module("B")), C.key(), List.of(module("C"))),
            Map.of());

    private static Step step(Requirement requirement, UUID official) {
        return RequirementPathwayGenerationService.step(REQUEST, requirement, Kind.REQUIRED, null, CATALOG, official);
    }

    /** Same adapter shape as {@code Rq3SimulationRunner.refresh}. */
    private static Plan refresh(Plan plan, Map<String, UUID> official) {
        List<Step> steps = new ArrayList<>();
        for (Step previous : plan.steps()) {
            if (previous.state() == State.FULFILLED) {
                steps.add(previous);
                continue;
            }
            var next = step(previous.requirement(), official.get(previous.requirement().proofKey()));
            steps.add(RequirementPathwayPlanningService.refreshedStep(previous, previous.requirement(), next, Set.of()));
        }
        return new Plan(steps, plan.dependencies());
    }

    private static Step find(Plan plan, Requirement requirement) {
        return plan.steps().stream().filter(s -> s.requirement().key().equals(requirement.key())).findFirst().orElseThrow();
    }

    private static UUID id(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes());
    }

    @Test
    void prerequisiteFailureWithoutOfficialEvidenceAddsBlockingSupplementThatProvisionResolves() {
        Plan plan = new Plan(List.of(step(A, null)), List.of());
        Step parent = find(plan, A);
        Plan supplemented = RequirementPathwayRecalculationService.supplement(REQUEST, plan, parent, id("attempt-1"),
                List.of(new FailedPrerequisite(id("group-b"), B)));

        assertThat(supplemented.steps()).hasSize(2);
        assertThat(find(supplemented, A).state()).isEqualTo(State.IN_PROGRESS);
        assertThat(find(supplemented, B).state()).isEqualTo(State.NEEDS_EXPERT_ACTION);
        assertThat(supplemented.dependencies()).singleElement()
                .satisfies(edge -> assertThat(edge.dependentStepId()).isEqualTo(parent.id()));

        Plan refreshed = refresh(supplemented, Map.of());
        assertThat(find(refreshed, B).state()).isEqualTo(State.NEEDS_SUPPLEMENTATION);
        assertThat(find(refreshed, B).options()).extracting(RequirementPathway.Option::moduleId).containsExactly("M-B");
        assertThat(refreshed.unmetPrerequisites(parent.id())).extracting(Step::requirement).containsExactly(B);
        assertThat(refreshed.targetReleased()).isFalse();
    }

    @Test
    void retakeWithPassingPrerequisiteKeepsAssignedLearningUntilOfficialEvidence() {
        Plan plan = refresh(RequirementPathwayRecalculationService.supplement(REQUEST, new Plan(List.of(step(A, null)), List.of()),
                step(A, null), id("attempt-1"), List.of(new FailedPrerequisite(id("group-b"), B))), Map.of());
        // Retake of A in which B now passes: no failed groups.
        Plan retake = refresh(RequirementPathwayRecalculationService.supplement(REQUEST, plan, find(plan, A), id("attempt-2"), List.of()), Map.of());
        assertThat(retake.steps()).hasSize(2);
        assertThat(retake.dependencies()).hasSize(1);
        assertThat(find(retake, B).resolved()).isFalse();

        Map<String, UUID> official = Map.of(B.proofKey(), id("evidence-b"));
        Plan afterEvidence = refresh(retake, official);
        assertThat(find(afterEvidence, B).state()).isEqualTo(State.FULFILLED);
        assertThat(afterEvidence.unmetPrerequisites(find(afterEvidence, A).id())).isEmpty();
        assertThat(afterEvidence.targetReleased()).isFalse();

        Plan released = refresh(afterEvidence, Map.of(B.proofKey(), id("evidence-b"), A.proofKey(), id("evidence-a")));
        assertThat(released.targetReleased()).isTrue();
        assertThat(released.steps()).noneMatch(s -> s.state() == State.ASSESSED_SATISFIED);
    }

    @Test
    void sharedPrerequisiteIsDeduplicatedAcrossParentsAndRepeatedEvents() {
        Plan plan = new Plan(List.of(step(A, null), step(C, null)), List.of());
        plan = RequirementPathwayRecalculationService.supplement(REQUEST, plan, find(plan, A), id("attempt-a"),
                List.of(new FailedPrerequisite(id("group-a-b"), B)));
        plan = RequirementPathwayRecalculationService.supplement(REQUEST, plan, find(plan, C), id("attempt-c"),
                List.of(new FailedPrerequisite(id("group-c-b"), B)));
        Plan repeated = RequirementPathwayRecalculationService.supplement(REQUEST, plan, find(plan, C), id("attempt-c"),
                List.of(new FailedPrerequisite(id("group-c-b"), B)));

        assertThat(plan.steps().stream().filter(s -> s.requirement().key().equals(B.key()))).hasSize(1);
        assertThat(find(plan, B).assessedSources()).hasSize(2);
        assertThat(plan.dependencies()).hasSize(2);
        assertThat(repeated).isEqualTo(plan);
    }

    @Test
    void alreadyOfficialPrerequisiteFailureRequestsReviewWithoutSupplement() {
        var main = new RuleAssessment.Requirement("A", KnowledgeLevel.FOUNDATION, List.of());
        var pre = new RuleAssessment.Requirement("B", KnowledgeLevel.FOUNDATION, List.of());
        var results = List.of(
                new GroupResult(id("g-main"), main, GroupRole.MAIN, 2, 2, true, true, false, List.of()),
                new GroupResult(id("g-pre"), pre, GroupRole.PREREQUISITE, 0, 2, true, false, false, List.of()));
        var official = Set.of(pre.key());
        var decision = RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT, results, official, official, false);
        assertThat(decision.reviews()).hasSize(1);
        assertThat(decision.supplements()).isEmpty();
        assertThat(decision.state()).isEqualTo(RuleAssessmentDecision.State.READY);

        var notOfficial = RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT, results, Set.of(), Set.of(), false);
        assertThat(notOfficial.supplements()).hasSize(1);
        assertThat(notOfficial.state()).isEqualTo(RuleAssessmentDecision.State.WAITING_SUPPLEMENT);
    }

    @Test
    void mainFailureVetoAndPendingLearningNeverAwardReadyState() {
        var main = new RuleAssessment.Requirement("A", KnowledgeLevel.FOUNDATION, List.of());
        var failedMain = List.of(new GroupResult(id("g"), main, GroupRole.MAIN, 0, 2, true, false, false, List.of()));
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT, failedMain, Set.of(), Set.of(), false).state())
                .isEqualTo(RuleAssessmentDecision.State.MAIN_FAILED);
        var veto = List.of(new GroupResult(id("g"), main, GroupRole.MAIN, 2, 2, true, true, true, List.of()));
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT, veto, Set.of(), Set.of(), false).state())
                .isEqualTo(RuleAssessmentDecision.State.VETO_RETAKE_REQUIRED);
        var pass = List.of(new GroupResult(id("g"), main, GroupRole.MAIN, 2, 2, true, true, false, List.of()));
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT, pass, Set.of(), Set.of(), true).state())
                .isEqualTo(RuleAssessmentDecision.State.WAITING_SUPPLEMENT);
        assertThat(RuleAssessmentDecision.decide(Purpose.SKILL_ASSESSMENT, pass, Set.of(), Set.of(), false).state())
                .isEqualTo(RuleAssessmentDecision.State.READY);
    }

    @Test
    void supplementWithoutProvisionNeedsExpertActionAndBlocksTheParent() {
        Plan plan = new Plan(List.of(step(A, null)), List.of());
        Plan refreshed = refresh(RequirementPathwayRecalculationService.supplement(REQUEST, plan, find(plan, A), id("attempt"),
                List.of(new FailedPrerequisite(id("group"), UNPROVIDED))), Map.of());
        assertThat(find(refreshed, UNPROVIDED).state()).isEqualTo(State.NEEDS_EXPERT_ACTION);
        assertThat(refreshed.unmetPrerequisites(find(refreshed, A).id())).hasSize(1);
    }

    @Test
    void resolvedStepWithoutOfficialEvidenceDoesNotReduceDistance() {
        var distance = new Rq3Distance(List.of(A, B));
        Plan released = refresh(new Plan(List.of(step(A, null)), List.of()), Map.of(A.proofKey(), id("evidence-a")));
        assertThat(released.targetReleased()).isTrue();
        // Only official proof keys enter E(u, b): a released plan alone leaves B missing.
        assertThat(distance.remaining(Set.of(A.proofKey()))).isEqualTo(0.5);
    }
}
