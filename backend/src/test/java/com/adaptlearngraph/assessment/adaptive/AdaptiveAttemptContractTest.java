package com.adaptlearngraph.assessment.adaptive;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.adaptlearngraph.assessment.adaptive.AdaptiveFixture.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.*;
import com.adaptlearngraph.assessment.adaptive.psychometrics.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
/** RB15, AB-A02/A05/A06/A09, bounded invariants; no approved numerical benchmark claimed. */
class AdaptiveAttemptContractTest {
 @Test void fullUnionIndependentOfRoleAndLegacyScopeRetained() {
  var a=snapshot(version());
  var b=new AdaptiveAttemptSnapshot(version(),a.purpose(),Optional.of("role-b"),Optional.of(2L),pool());
  assertThat(a.microSkillIds()).containsExactlyInAnyOrder("s1","s2","s3");
  assertThat(b.microSkillIds()).isEqualTo(a.microSkillIds());assertThat(b.bounds()).isEqualTo(a.bounds());
  var v=version();var legacy=new com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Version(v.scope(),v.id(),
   new com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Configuration("Legacy",new com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Bounds(6,360),
    Map.of("role-a",new com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Bounds(6,360),"role-b",new com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Bounds(6,360))),
   v.occupationNameSnapshot(),v.catalogFingerprint(),v.pins(),v.roles(),v.createdBy(),v.createdAt());
  var oldPool=new TreeMap<UUID,String>(pool());oldPool.values().removeIf(s->s.equals("s3"));
  var old=new AdaptiveAttemptSnapshot(legacy,a.purpose(),Optional.of("role-a"),Optional.of(1L),oldPool);
  assertThat(old.microSkillIds()).containsExactlyInAnyOrder("s1","s2");assertThat(old.bounds().timeLimitSeconds()).isEqualTo(360);
 }
 @Test void insufficientManualSubmissionInvalidatesWithoutMastery() {
  var a=attempt();var store=mock(AdaptiveAttemptStore.class);var policies=mock(AdaptiveAttemptPolicyPort.class);
  var outcomes=mock(AdaptiveAttemptOutcomePort.class);
  when(store.progress(a.scope(),a.id())).thenReturn(new AdaptiveAttemptStore.Progress(List.of(),List.of(),List.of()));
  when(store.observedAt(a.scope())).thenReturn(NOW.plusSeconds(1));
  when(policies.load(a.snapshot().blueprint().pins(),pool())).thenReturn(new AdaptiveAttemptPolicyPort.Policy(policy(),items()));
  var next=new AdaptiveAttemptFinalizationService(store,policies,outcomes).finalizeAccepted(a);
  assertThat(next.status()).isEqualTo(AdaptiveAttempt.Status.INVALIDATED);
  assertThat(next.completionReason()).contains(AdaptiveAttempt.CompletionReason.MANUAL);
  assertThat(next.masteryProducing()).isFalse();
  var capture=org.mockito.ArgumentCaptor.forClass(AdaptiveAttemptOutcomePort.Completion.class);
  verify(outcomes).persist(capture.capture());assertThat(capture.getValue().skills()).isEmpty();
 }
 @Test void deadlineIsHardAndReplacementKeepsPins() {
  var a=attempt();assertThatThrownBy(()->a.advance(1,a.deadlineAt())).isInstanceOf(IllegalStateException.class);
  var expired=a.complete(1,a.deadlineAt(),true,false);
  assertThat(expired.status()).isEqualTo(AdaptiveAttempt.Status.INVALIDATED);
  assertThat(expired.completionReason()).contains(AdaptiveAttempt.CompletionReason.DEADLINE);
  var replacement=AdaptiveAttempt.start(id(31),a.scope(),a.snapshot(),a.deadlineAt(),false,Optional.of(expired));
  assertThat(replacement.replacesAttemptId()).contains(a.id());assertThat(replacement.snapshot()).isEqualTo(a.snapshot());
  assertThatThrownBy(()->AdaptiveAttempt.start(id(32),a.scope(),a.snapshot(),NOW,true,Optional.empty())).isInstanceOf(IllegalStateException.class);
 }
 @ParameterizedTest @ValueSource(booleans={true,false})
 void minimumEvidenceAllowsFinalizationForAllCorrectAndAllWrong(boolean correct) {
  var selector=new AdaptiveItemSelector(policy(),Set.of("s1","s2","s3"),items(),9);
  var answers=items().stream().map(i->new Irt3pl.Answer(i.id(),correct)).toList();
  var decision=selector.evaluate(answers,pool().keySet(),NOW,NOW.plusSeconds(540),true);
  assertThat(decision.action()).isEqualTo(AdaptiveItemSelector.Action.FINISH);
  assertThat(decision.mastery()).containsOnlyKeys("s1","s2","s3");
  decision.mastery().values().forEach(m->{assertThat(m.mastery()).isBetween(0d,1d);assertThat(m.mastery()).isLessThanOrEqualTo(m.estimatedMastery());});
 }
 @Test void deterministicSelectionAndNoEarlyStopBelowFullCoverage() {
  var selector=new AdaptiveItemSelector(policy(),Set.of("s1","s2","s3"),items(),9);
  var first=selector.evaluate(List.of(),Set.of(),NOW,NOW.plusSeconds(540),false);
  assertThat(first.action()).isEqualTo(AdaptiveItemSelector.Action.NEXT);
  assertThat(first.next().orElseThrow().id()).isEqualTo(id(100));
  var again=selector.evaluate(List.of(),Set.of(id(100)),NOW,NOW.plusSeconds(540),false);
  assertThat(again.next()).isEqualTo(first.next());
  var insufficient=selector.evaluate(List.of(),Set.of(),NOW,NOW.plusSeconds(540),true);
  assertThat(insufficient.action()).isEqualTo(AdaptiveItemSelector.Action.REJECT_SUBMIT);
  assertThat(insufficient.mastery()).isEmpty();
 }

 @Test void abS01ApprovedFormulaHasExactClosedFormAtThetaEqualsDifficulty(){
  var item=new Irt3pl.Item(id(100),"s1",PINS.parameterSetId(),1,0,.25);
  assertThat(Irt3pl.probability(item,0)).isEqualTo(.625);
  assertThat(Irt3pl.logistic(0)).isEqualTo(.5);
 }
}