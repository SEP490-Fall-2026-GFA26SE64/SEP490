package com.adaptlearngraph.learning.infrastructure;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.dao.DataAccessResourceFailureException;
/** RB13 regression: retained filename, tests the replacement PostgreSQL activity adapter. */
class ConfiguredAssessmentActivityGuardAdapterTest {
 @Test void persistedActivityAndOutage() {
  var jdbc=mock(NamedParameterJdbcTemplate.class);
  var guard=new AdaptiveBaselineAssessmentActivityGuardAdapter(jdbc);
  when(jdbc.queryForObject(anyString(),anyMap(),eq(Boolean.class))).thenReturn(false,true);
  assertThat(guard.hasBlockingAssessment(new UUID(0,3))).isFalse();
  assertThat(guard.hasBlockingAssessment(new UUID(0,3))).isTrue();
  when(jdbc.queryForObject(anyString(),anyMap(),eq(Boolean.class))).thenThrow(new DataAccessResourceFailureException("outage"));
  assertThatThrownBy(()->guard.hasBlockingAssessment(new UUID(0,3))).isInstanceOf(
   com.adaptlearngraph.learning.application.port.out.AssessmentActivityGuardPort.ActivityGuardUnavailableException.class);
 }
 @Test void invalidIdentityNeverQueries() {
  var jdbc=mock(NamedParameterJdbcTemplate.class);
  var guard=new AdaptiveBaselineAssessmentActivityGuardAdapter(jdbc);
  assertThatThrownBy(()->guard.hasBlockingAssessment(new UUID(0,0))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->guard.hasBlockingAssessment(null)).isInstanceOf(NullPointerException.class);
  verifyNoInteractions(jdbc);
 }
}