package com.adaptlearngraph.repository;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static com.adaptlearngraph.services.AdaptiveFixture.*;
import com.adaptlearngraph.entities.AdaptiveBlueprint.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import com.adaptlearngraph.entities.AuditEventEntity;
/** RB07/15: initializer's evidence shape, zero mastery and no mutation on invalidated outcomes. */
class CurrentOccupationProfileTest {
 @Test void zeroMasteryInitializesWithoutProficiencyThreshold(){
  var profiles=mock(EmployeeOccupationProfileJpaRepository.class);var audit=mock(AuditEventJpaRepository.class);
  var profile=new CurrentOccupationProfile(profiles,audit,new ObjectMapper().findAndRegisterModules(),null,null,null);
  when(profiles.insertIfAbsent(any(),any(),any(),any(),any(),anyInt(),any(),any(),any(),any())).thenReturn(1);
  var terminal=attempt().complete(1,NOW.plusSeconds(1),false,true);
  var values=new TreeMap<String,AdaptiveAttemptOutcomePort.Skill>();
  for(var id:List.of("s1","s2","s3"))values.put(id,new AdaptiveAttemptOutcomePort.Skill(BigDecimal.ZERO,BigDecimal.ONE,BigDecimal.valueOf(.5),BigDecimal.ZERO,"LOW"));
  profile.initialize(new AdaptiveAttemptOutcomePort.Completion(terminal,9,0,values));
  var mastery=org.mockito.ArgumentCaptor.forClass(String.class);
  verify(profiles).insertIfAbsent(any(),any(),any(),any(),any(),anyInt(),any(),any(),mastery.capture(),any());
  verify(audit).insert(any(AuditEventEntity.class));
  assertThat(mastery.getValue()).isEqualTo("{\"s1\":0,\"s2\":0,\"s3\":0}");
 }
 @Test void invalidatedAndIncompleteOutcomesNeverCreateProfile(){
  var profiles=mock(EmployeeOccupationProfileJpaRepository.class);var audit=mock(AuditEventJpaRepository.class);
  var profile=new CurrentOccupationProfile(profiles,audit,new ObjectMapper(),null,null,null);
  profile.initialize(new AdaptiveAttemptOutcomePort.Completion(attempt().complete(1,NOW.plusSeconds(1),false,false),0,0,Map.of()));
  assertThatThrownBy(()->profile.initialize(new AdaptiveAttemptOutcomePort.Completion(attempt().complete(1,NOW.plusSeconds(1),false,true),9,0,Map.of()))).isInstanceOf(IllegalStateException.class);
  verifyNoInteractions(profiles,audit);
 }
 @Test void commonConfigurationUnicodeAndTimeBoundsLeaveLegacyUnchanged(){
  assertThat(Configuration.occupation("😀".repeat(100),new Bounds(45,3000)).name().codePointCount(0,200)).isEqualTo(100);
  assertThatThrownBy(()->Configuration.occupation("😀".repeat(101),new Bounds(45,3000))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->Configuration.occupation("Too short",new Bounds(45,1349))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->Configuration.occupation("Too long",new Bounds(45,5401))).isInstanceOf(IllegalArgumentException.class);
  assertThat(new Configuration("Legacy",new Bounds(1,1),Map.of("role-a",new Bounds(1,1))).exploration().timeLimitSeconds()).isEqualTo(1);
 }
}
