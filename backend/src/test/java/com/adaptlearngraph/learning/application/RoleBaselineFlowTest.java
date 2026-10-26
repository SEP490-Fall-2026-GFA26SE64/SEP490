package com.adaptlearngraph.learning.application;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.adaptlearngraph.learning.application.RoleBaselineFlow.*;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
/** RB02-08/11/13/16/17. F15 v1: 3 roles, 15 distinct skills, repeated skill-0. */
class RoleBaselineFlowTest {
 final Actor actor=new Actor(new UUID(0,1),new UUID(0,3));
 final Identity identity=mock(Identity.class);
 final Catalog catalog=mock(Catalog.class);
 final Store store=mock(Store.class);
 final Baseline baseline=mock(Baseline.class);
 final RoleBaselineFlow flow=new RoleBaselineFlow(identity,catalog,store,baseline);
 final Role role=role("role-a",0,5);
 final Selection selected=new Selection(new UUID(0,20),role,1,Instant.EPOCH,true);
 @BeforeEach void setup() {
  when(identity.requireEmployee()).thenReturn(actor);
  when(catalog.roles(actor.organizationId())).thenReturn(List.of(role,role("role-b",5,10),role("role-c",10,15)));
  when(store.current(actor)).thenReturn(Optional.of(selected));
  when(store.transaction(eq(actor),any())).thenAnswer(i->((Supplier<?>)i.getArgument(1)).get());
 }
 @Test void rb02SearchUsesStringIdsAndSeparateLevels() {
  assertThat(flow.roles("  ROLE-A  ")).containsExactly(role);
  assertThat(role.levels().getFirst().skills()).hasSize(6);
  verifyNoInteractions(store,baseline);
 }
 @Test void rb06And08FullOccupationUnionDeduplicatesSharedSkill() {
  var expected=new HashSet<String>();for(int i=0;i<15;i++)expected.add("skill-"+i);
  when(baseline.progress(actor,role,expected)).thenReturn(new Progress("BASELINE_REQUIRED",15,14,null,1));
  assertThat(flow.view().progress()).isEqualTo(new Progress("BASELINE_REQUIRED",15,14,null,1));
  verify(baseline).progress(actor,role,expected);
  verify(store,never()).select(any(),any(),anyString(),anyString());
 }
 @Test void rb03DeletedSelectionRetainsOriginalSnapshot() {
  when(catalog.roles(actor.organizationId())).thenReturn(List.of(role("new-role",0,5)));
  var view=flow.view();
  assertThat(view.selection().available()).isFalse();
  assertThat(view.selection().role()).isEqualTo(role);
  assertThat(view.progress().state()).isEqualTo("ROLE_UNAVAILABLE");
  verifyNoInteractions(baseline);
 }
 @Test void rb08EmptyUnionFailsClosed() {
  when(catalog.roles(actor.organizationId())).thenReturn(List.of(new Role("role-a","A","A","scope","occupation-a","A","v1","f",List.of())));
  failure(503,"DEPENDENCY_UNAVAILABLE",flow::view);verifyNoInteractions(baseline);
 }
 @Test void rb05ReplayPrecedesCatalogAndStaleChecks() {
  when(store.replay(eq(actor),eq("retry"),anyString())).thenReturn(Optional.of(selected));
  assertThat(flow.choose(role.id(),null,"retry")).isEqualTo(selected);
  verifyNoInteractions(catalog,baseline);
 }
 @Test void rb05StaleSelectionNeverMutates() {
  failure(409,"STALE_SELECTION",()->flow.choose("role-b",null,"key"));
  verifyNoInteractions(catalog,baseline);
  verify(store,never()).select(any(),any(),anyString(),anyString());
 }
 @Test void rb13ActiveAttemptBlocksChangeAndAllowsSameRole() {
  when(store.assessmentActive(actor)).thenReturn(true);
  failure(409,"ASSESSMENT_IN_PROGRESS",()->flow.choose("role-b",selected.selectionId(),"change"));
  when(store.select(eq(actor),eq(role),eq("noop"),anyString())).thenReturn(selected);
  assertThat(flow.choose(role.id(),selected.selectionId(),"noop")).isEqualTo(selected);
 }
 @Test void rb16ReauthorizesBeforeReplay() {
  when(identity.requireEmployee()).thenReturn(actor,new Actor(actor.organizationId(),new UUID(0,4)));
  failure(403,"FORBIDDEN",()->flow.choose(role.id(),selected.selectionId(),"key"));
  verify(store,never()).replay(any(),anyString(),anyString());
 }
 @Test void rb11ReadOutageNeverIssuesAnotherCommand() {
  when(baseline.progress(eq(actor),eq(role),anySet())).thenThrow(new IllegalStateException("outage"));
  assertThatThrownBy(flow::view).isInstanceOf(IllegalStateException.class);
  verify(store,never()).select(any(),any(),anyString(),anyString());
 }
 @Test void rb17EmptyAndMasteryReadsDoNotEnterWriteTransaction() {
  when(store.current(actor)).thenReturn(Optional.empty());
  when(baseline.mastery(actor)).thenReturn(List.of());
  assertThat(flow.view().progress().state()).isEqualTo("SELECT_ROLE");
  assertThat(flow.mastery()).isEmpty();verify(store,never()).transaction(any(),any());
  verifyNoInteractions(catalog);
 }
 static Role role(String id,int start,int end) {
  var skills=new ArrayList<Skill>();
  for(int i=start;i<end;i++)skills.add(new Skill("skill-"+i,"S"+i,"Skill "+i,.7,true));
  skills.add(new Skill("skill-0","S0","Skill 0",.7,true));
  return new Role(id,id,id,"Scope","occupation-a","Occupation A","v1","fixture-f15-v1",
   List.of(new Level("level-"+id,"L1","Junior",1,"Context","ALL",skills)));
 }
 static void failure(int status,String code,Runnable call) {
  assertThatThrownBy(call::run).isInstanceOfSatisfying(Failure.class,e->{
   assertThat(e.status).isEqualTo(status);assertThat(e.code).isEqualTo(code);});
 }
}