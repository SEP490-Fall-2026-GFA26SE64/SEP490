package com.adaptlearngraph.assessment.adaptive;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static com.adaptlearngraph.assessment.adaptive.AdaptiveFixture.*;
import com.adaptlearngraph.assessment.adaptive.demo.CurrentOccupationProfile;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.*;
/** RB07/15: initializer's evidence shape, zero mastery and no mutation on invalidated outcomes. */
class CurrentOccupationProfileTest {
 @Test void zeroMasteryInitializesWithoutProficiencyThreshold(){
  var jdbc=mock(NamedParameterJdbcTemplate.class);
  var profile=new CurrentOccupationProfile(jdbc,new ObjectMapper().findAndRegisterModules(),null,null,null);
  when(jdbc.update(anyString(),any(MapSqlParameterSource.class))).thenReturn(1);
  var terminal=attempt().complete(1,NOW.plusSeconds(1),false,true);
  var values=new TreeMap<String,AdaptiveAttemptOutcomePort.Skill>();
  for(var id:List.of("s1","s2","s3"))values.put(id,new AdaptiveAttemptOutcomePort.Skill(BigDecimal.ZERO,BigDecimal.ONE,BigDecimal.valueOf(.5),BigDecimal.ZERO,"LOW"));
  profile.initialize(new AdaptiveAttemptOutcomePort.Completion(terminal,9,0,values));
  var params=org.mockito.ArgumentCaptor.forClass(MapSqlParameterSource.class);
  verify(jdbc,times(2)).update(anyString(),params.capture());
  assertThat(params.getAllValues().getFirst().getValue("mastery").toString()).isEqualTo("{\"s1\":0,\"s2\":0,\"s3\":0}");
 }
 @Test void invalidatedAndIncompleteOutcomesNeverCreateProfile(){
  var jdbc=mock(NamedParameterJdbcTemplate.class);
  var profile=new CurrentOccupationProfile(jdbc,new ObjectMapper(),null,null,null);
  profile.initialize(new AdaptiveAttemptOutcomePort.Completion(attempt().complete(1,NOW.plusSeconds(1),false,false),0,0,Map.of()));
  assertThatThrownBy(()->profile.initialize(new AdaptiveAttemptOutcomePort.Completion(attempt().complete(1,NOW.plusSeconds(1),false,true),9,0,Map.of()))).isInstanceOf(IllegalStateException.class);
  verifyNoInteractions(jdbc);
 }
 @Test void commonConfigurationUnicodeAndTimeBoundsLeaveLegacyUnchanged(){
  assertThat(Configuration.occupation("😀".repeat(100),new Bounds(45,3000)).name().codePointCount(0,200)).isEqualTo(100);
  assertThatThrownBy(()->Configuration.occupation("😀".repeat(101),new Bounds(45,3000))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->Configuration.occupation("Too short",new Bounds(45,1349))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->Configuration.occupation("Too long",new Bounds(45,5401))).isInstanceOf(IllegalArgumentException.class);
  assertThat(new Configuration("Legacy",new Bounds(1,1),Map.of("role-a",new Bounds(1,1))).exploration().timeLimitSeconds()).isEqualTo(1);
 }
}
