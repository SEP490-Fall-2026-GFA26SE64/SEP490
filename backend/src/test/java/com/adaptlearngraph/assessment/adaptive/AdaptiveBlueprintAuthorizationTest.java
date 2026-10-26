package com.adaptlearngraph.assessment.adaptive;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.adaptlearngraph.assessment.adaptive.AdaptiveFixture.*;
import com.adaptlearngraph.assessment.adaptive.application.*;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.*;
import java.time.Clock;
import java.util.*;
import org.junit.jupiter.api.Test;
class AdaptiveBlueprintAuthorizationTest {
 @Test void abC07ForbiddenActorsAreRejectedBeforeCapacityOrHistoryDisclosure(){
  var actors=mock(AdaptiveBlueprintActorPort.class);var store=mock(AdaptiveBlueprintStore.class);
  var eligibility=mock(AdaptiveBlueprintEligibilityPort.class);var preview=mock(AdaptiveBlueprintPreviewPort.class);
  var service=new AdaptiveBlueprintService(actors,store,eligibility,preview,Clock.systemUTC());
  for(var roles:List.of(Set.of("EMPLOYEE"),Set.of("ADMINISTRATOR"),Set.<String>of())){
   when(actors.currentActor()).thenReturn(Optional.of(new AdaptiveBlueprintActorPort.Actor(EMP,ORG,true,roles)));
   assertThatThrownBy(()->service.getWorkspace(OCC)).isInstanceOfSatisfying(Failure.class,e->assertThat(e.code()).isEqualTo(Code.FORBIDDEN));
  }
  verifyNoInteractions(store,eligibility,preview);
 }
 @Test void abC07MissingInactiveAndForeignScopeFailBeforeQueries(){
  var actors=mock(AdaptiveBlueprintActorPort.class);var store=mock(AdaptiveBlueprintStore.class);
  var eligibility=mock(AdaptiveBlueprintEligibilityPort.class);var preview=mock(AdaptiveBlueprintPreviewPort.class);
  var service=new AdaptiveBlueprintService(actors,store,eligibility,preview,Clock.systemUTC());
  assertThatThrownBy(()->service.getWorkspace(OCC)).isInstanceOfSatisfying(Failure.class,e->assertThat(e.code()).isEqualTo(Code.UNAUTHENTICATED));
  when(actors.currentActor()).thenReturn(Optional.of(new AdaptiveBlueprintActorPort.Actor(MANAGER,ORG,false,Set.of("LD_MANAGER"))));
  assertThatThrownBy(()->service.getWorkspace(OCC)).isInstanceOfSatisfying(Failure.class,e->assertThat(e.code()).isEqualTo(Code.FORBIDDEN));
  when(actors.currentActor()).thenReturn(Optional.of(new AdaptiveBlueprintActorPort.Actor(MANAGER,ORG,true,Set.of("LD_MANAGER"))));
  assertThatThrownBy(()->service.list(new AdaptiveBlueprintListing.Query("",null,AdaptiveBlueprintListing.Direction.NEWEST,0,20,"foreign-occ"))).isInstanceOfSatisfying(Failure.class,e->assertThat(e.code()).isEqualTo(Code.FORBIDDEN));
  verifyNoInteractions(store,eligibility,preview);
 }
}
