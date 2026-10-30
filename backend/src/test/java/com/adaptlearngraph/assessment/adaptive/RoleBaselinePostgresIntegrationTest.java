package com.adaptlearngraph.assessment.adaptive;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static com.adaptlearngraph.assessment.adaptive.AdaptiveFixture.*;
import com.adaptlearngraph.assessment.adaptive.application.*;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.adaptlearngraph.assessment.adaptive.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.*;
import com.adaptlearngraph.assessment.adaptive.infrastructure.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.*;
import com.adaptlearngraph.assessment.adaptive.attempt.infrastructure.*;
import com.adaptlearngraph.assessment.adaptive.demo.CurrentOccupationProfile;
import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.adaptlearngraph.learning.infrastructure.CurrentRoleSelectionStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

/** Disposable real PostgreSQL, migrations V1-26, no Compose address/volume. F3-v1. */
class RoleBaselinePostgresIntegrationTest {
 static final PostgreSQLContainer<?> PG=new PostgreSQLContainer<>("postgres:17.6-alpine");
 static final ObjectMapper JSON=new ObjectMapper().findAndRegisterModules();
 JdbcTemplate sql; NamedParameterJdbcTemplate jdbc; DataSourceTransactionManager manager;
 JdbcAdaptiveBlueprintStore blueprints; JdbcAdaptiveAttemptStore attempts; CurrentOccupationProfile profiles;
 AdaptiveBlueprintEligibilityPort eligibility; AdaptiveBlueprintService authoring; Version version;
 AdaptiveAttemptContextPort context; AdaptiveAttemptStartService starts; AdaptiveAttemptSubmitService submits;
 AdaptiveAttemptAnswerService answers; JdbcAdaptiveAttemptResultQuery results; CurrentRoleSelectionStore selections;
 @BeforeAll static void startContainer(){PG.start();}
 @AfterAll static void stop(){PG.stop();}
 @BeforeEach void setup() {
  var ds=new DriverManagerDataSource(PG.getJdbcUrl(),PG.getUsername(),PG.getPassword());
  sql=new JdbcTemplate(ds);jdbc=new NamedParameterJdbcTemplate(ds);manager=new DataSourceTransactionManager(ds);
  sql.execute("DROP SCHEMA IF EXISTS platform CASCADE");sql.execute("DROP TABLE IF EXISTS public.flyway_schema_history");
  Flyway.configure().dataSource(ds).load().migrate();
  sql.update("INSERT INTO platform.organization(organization_id,code,name) VALUES (?,'A','Org A'),(?,'B','Org B')",ORG,id(2));
  for(var who:List.of(EMP,OTHER,MANAGER,id(6))) {
   var org=who.equals(id(6))?id(2):ORG;
   sql.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES (?,?,?,?, 'test-only')",who,org,"fixture-"+who,"fixture-"+who);
   sql.update("INSERT INTO platform.learner_state(learner_id) VALUES (?)",who);
   sql.update("INSERT INTO platform.account_role(account_id,role_code) VALUES (?,'EMPLOYEE')",who);
  }
  new TransactionTemplate(manager).execute(status->{
   sql.update("INSERT INTO platform.model_version(model_version_id,algorithm,version,parameter_hash,configuration,artifact_ref) VALUES (?,'IRT_3PL','TEST_F3_V1',?, CAST(? AS jsonb),'test:F3')",PINS.modelVersionId(),"a".repeat(64),json(policy().model()));
   sql.update("INSERT INTO platform.mastery_mapping_version(mastery_mapping_version_id,mapping_type,configuration,configuration_hash) VALUES (?,'LOGISTIC_CONSERVATIVE_V1',CAST(? AS jsonb),?)",PINS.masteryMappingVersionId(),json(policy().mapping()),"b".repeat(64));
   sql.update("INSERT INTO platform.question_bank(question_bank_id,name,created_by) VALUES (?,'F3 bank',?)",id(50),MANAGER);
   sql.update("INSERT INTO platform.irt_parameter_set(parameter_set_id,model_version_id,source,status,parameter_hash) VALUES (?,?,'SEEDED','BUILDING',?)",PINS.parameterSetId(),PINS.modelVersionId(),"c".repeat(64));
   pool().forEach((item,skill)->{
    sql.update("INSERT INTO platform.item_version(item_version_id,item_id,version,question_bank_id,prompt,response_schema,protected_key,publication_state,content_hash,micro_skill_id,micro_skill_name_snapshot,difficulty) VALUES (?,?,1,?,'Fixture question','{\"options\":[{\"id\":\"a\",\"text\":\"Option A\"},{\"id\":\"b\",\"text\":\"Option B\"}]}'::jsonb,'{\"correctOptionId\":\"b\"}'::jsonb,'PUBLISHED',?,?,?,'EASY')",item,item,id(50),"d".repeat(64),skill,"Skill "+skill.substring(1));
    sql.update("INSERT INTO platform.irt_item_parameter(parameter_set_id,item_version_id,micro_skill_id,discrimination_a,difficulty_b,guessing_c) VALUES (?,?,?,1,0,0.25)",PINS.parameterSetId(),item,skill);
   });
   sql.update("UPDATE platform.irt_parameter_set SET status='CANDIDATE' WHERE parameter_set_id=?",PINS.parameterSetId());
   sql.update("UPDATE platform.irt_parameter_set SET status='PROMOTED',activated_by=?,activated_at=now() WHERE parameter_set_id=?",MANAGER,PINS.parameterSetId());
   return null;
  });
  blueprints=new JdbcAdaptiveBlueprintStore(jdbc,JSON,manager);
  eligibility=mock(AdaptiveBlueprintEligibilityPort.class);
  when(eligibility.resolve(SCOPE)).thenReturn(Optional.of(eligible()));
  when(eligibility.resolvePinned(SCOPE,PINS)).thenReturn(Optional.of(eligible()));
  var actors=new AdaptiveBlueprintActorPort(){
   public Optional<Actor> currentActor(){return Optional.of(new Actor(MANAGER,ORG,true,Set.of("LD_MANAGER")));}
   public Set<String> authorizedOccupations(Actor a){return Set.of(OCC);}
  };
  var preview=new JdbcAdaptiveBlueprintPreviewAdapter(jdbc,JSON,id(50));
  authoring=new AdaptiveBlueprintService(actors,blueprints,eligibility,preview,Clock.systemUTC());
  var draft=authoring.save(new Save(OCC,0,"fixture-save",config()));
  version=authoring.finalizeBlueprint(new Finalize(OCC,draft.workingRevisionId(),draft.revision(),0,"fixture-activate",null,true));
  attempts=new JdbcAdaptiveAttemptStore(jdbc,JSON,manager,blueprints);
  profiles=new CurrentOccupationProfile(jdbc,JSON,attempts,blueprints,eligibility);
  context=mock(AdaptiveAttemptContextPort.class);
  when(context.requireEmployee()).thenReturn(new AdaptiveAttemptContextPort.Employee(ORG,EMP));
  when(context.resolveScope(any(),any())).thenReturn(new AdaptiveAttempt.Scope(ORG,EMP,OCC));
  when(context.resolveStartingSnapshot(any(),any())).thenAnswer(i->snapshot(version));
  var policy=new PinnedAdaptiveAttemptPolicyAdapter(new JdbcAdaptiveTechnicalVersionStore(jdbc));
  var content=new JdbcAdaptiveAttemptContent(jdbc,id(50));
  var outcome=new JdbcAdaptiveAttemptOutcome(jdbc,JSON,attempts);
  var finalization=new AdaptiveAttemptFinalizationService(attempts,policy,c->{outcome.persist(c);profiles.initialize(c);});
  starts=new AdaptiveAttemptStartService(context,attempts,policy,content);
  submits=new AdaptiveAttemptSubmitService(context,attempts,finalization,content);
  answers=new AdaptiveAttemptAnswerService(context,attempts,policy,content,new JdbcAdaptiveAttemptScoring(jdbc,id(50)),Optional.of(finalization));
  results=new JdbcAdaptiveAttemptResultQuery(jdbc,context);
  selections=new CurrentRoleSelectionStore(jdbc,JSON,new TransactionTemplate(manager));
 }
 AdaptiveAttemptUseCase.View start(){return starts.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"start");}
 AdaptiveAttemptUseCase.View answer(AdaptiveAttemptUseCase.View view,String key) {
  var item=view.items().getLast();
  return answers.answer(new AdaptiveAttemptUseCase.Answer(view.id(),view.revision(),item.position(),item.itemVersionId(),"a",key));
 }
 AdaptiveAttemptUseCase.View finish(){var v=start();while(v.state().equals("IN_PROGRESS"))v=answer(v,"answer-"+v.revision());return v;}
 static String json(Object value){try{return JSON.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException(e);}}
 long count(String table){return sql.queryForObject("SELECT count(*) FROM platform."+table,Long.class);}
 String digest(){
  var tables=sql.queryForList("SELECT tablename FROM pg_tables WHERE schemaname='platform' ORDER BY tablename",String.class);
  var all=new StringBuilder();
  tables.forEach(t->all.append(t).append(sql.queryForObject("SELECT md5(coalesce(string_agg(row_json,',' ORDER BY row_json),'')) FROM (SELECT to_jsonb(t)::text row_json FROM platform."+t+" t) x",String.class)));
  return RoleBaselineFlow.hash(all.toString());
 }
 RoleBaselineFlow.Role role(String id,String occupation){return new RoleBaselineFlow.Role(id,id,id,"Scope",occupation,"Fixture Occupation","fixture-v1","fixture-f3-v1",List.of());}
 RoleBaselineFlow selectionFlow(UUID org,UUID learner){
  return new RoleBaselineFlow(()->new RoleBaselineFlow.Actor(org,learner),o->List.of(role("role-a",OCC),role("role-b",OCC),role("other","other-occ")),selections,mock(RoleBaselineFlow.Baseline.class));
 }
 @Test void rb05SelectionReplayNoOpChangeAndImmutableHistory(){
  var flow=selectionFlow(ORG,EMP);var first=flow.choose("role-a",null,"one");
  var noop=flow.choose("role-a",first.selectionId(),"noop");
  assertThat(noop).isEqualTo(first);assertThat(count("employee_role_selection")).isOne();
  assertThat(count("outbox_event")).isEqualTo(1); // selection event; activation has its owned transition table
  var changed=flow.choose("role-b",first.selectionId(),"two");
  assertThat(changed.revision()).isEqualTo(2);assertThat(flow.choose("role-a",null,"one")).isEqualTo(first);
  assertThat(count("employee_role_selection_request")).isEqualTo(3);
  assertThatThrownBy(()->flow.choose("other",changed.selectionId(),"one")).hasMessage("IDEMPOTENCY_CONFLICT");
  assertThat(selections.current(new RoleBaselineFlow.Actor(id(2),EMP))).isEmpty();
 }
 @Test void rb05SelectionRaceOneWinnerAndRollbackNoPartialWrites() throws Exception {
  var flow=selectionFlow(ORG,EMP);var barrier=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   Callable<String> a=()->{barrier.await();try{flow.choose("role-a",null,UUID.randomUUID().toString());return "ok";}catch(RoleBaselineFlow.Failure e){return e.code;}};
   var left=executor.submit(a);var right=executor.submit(a);barrier.countDown();
   assertThat(List.of(left.get(20,TimeUnit.SECONDS),right.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder("ok","STALE_SELECTION");
  }
  var before=digest();var actor=new RoleBaselineFlow.Actor(ORG,EMP);var previous=selections.current(actor).orElseThrow();
  assertThatThrownBy(()->selections.transaction(actor,()->{selections.select(actor,role("role-b",OCC),"rollback","e".repeat(64));throw new IllegalStateException("injected");})).hasMessage("injected");
  assertThat(digest()).isEqualTo(before);assertThat(selections.current(actor)).contains(previous);
 }
 @Test void rb04ActorTenantIsolationAndInactiveTransactionDenied(){
  var first=selectionFlow(ORG,EMP).choose("role-a",null,"one");
  assertThat(selections.current(new RoleBaselineFlow.Actor(ORG,OTHER))).isEmpty();
  assertThatThrownBy(()->selectionFlow(id(2),EMP).choose("role-a",null,"foreign")).hasMessage("FORBIDDEN");
  sql.update("UPDATE platform.account SET active=false WHERE account_id=?",EMP);
  assertThatThrownBy(()->selectionFlow(ORG,EMP).choose("role-b",first.selectionId(),"inactive")).hasMessage("FORBIDDEN");
 }
 @Test void vb01And04SaveOnlyDraftPreviewReadOnlyDiscardReplayAndStaleIdentity(){
  var original=version;var draft=authoring.save(new Save(OCC,0,"new-draft",Configuration.occupation("Edited",new Bounds(9,600))));
  assertThat(blueprints.findVersion(SCOPE,original.id())).contains(original);
  assertThat(count("baseline_adaptive_blueprint_version")).isOne();
  var noop=authoring.saveResult(new Save(OCC,draft.revision(),"noop",draft.configuration(),draft.workingRevisionId()));
  assertThat(noop.noOp()).isTrue();assertThat(noop.working().revision()).isEqualTo(1);
  var before=digest();assertThat(authoring.previewSaved(new PreviewSaved(OCC,draft.workingRevisionId(),1)).feasible()).isTrue();
  assertThat(digest()).isEqualTo(before);
  assertThatThrownBy(()->authoring.save(new Save(OCC,1,"stale-id",config(),id(999)))).isInstanceOf(Failure.class);
  var command=new PreviewSaved(OCC,draft.workingRevisionId(),1);
  assertThat(authoring.discard(command,"discard")).isEqualTo(draft);
  assertThat(authoring.discard(command,"discard")).isEqualTo(draft);
  assertThat(blueprints.findWorking(SCOPE)).isEmpty();
  assertThat(blueprints.findVersion(SCOPE,original.id())).contains(original);
 }
 @Test void vb04ConcurrentDraftCreationAndActivationHaveSingleWinner() throws Exception {
  var gate=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   Callable<String> work=()->{gate.await();try{authoring.save(new Save(OCC,0,UUID.randomUUID().toString(),config()));return "ok";}catch(Failure e){return e.code().name();}};
   var a=executor.submit(work);var b=executor.submit(work);gate.countDown();
   assertThat(List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder("ok","VERSION_CONFLICT");
  }
  var draft=blueprints.findWorking(SCOPE).orElseThrow();var activation=blueprints.findActivation(SCOPE).orElseThrow();
  var gate2=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   Callable<String> work=()->{gate2.await();try{authoring.finalizeBlueprint(new Finalize(OCC,draft.workingRevisionId(),draft.revision(),activation.revision(),UUID.randomUUID().toString(),version.id(),true));return "ok";}catch(Failure e){return e.code().name();}};
   var a=executor.submit(work);var b=executor.submit(work);gate2.countDown();
   assertThat(List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder("ok","VERSION_CONFLICT");
  }
  assertThat(count("baseline_adaptive_blueprint_version")).isEqualTo(2);
 }
 @Test void rb13StartReplayResumePreservesDeadlinePinsAndBlocksRoleChange(){
  var flow=selectionFlow(ORG,EMP);var selected=flow.choose("role-a",null,"selection");
  var v=start();var replay=start();assertThat(replay).isEqualTo(v);
  assertThat(starts.resume(v.id()).deadlineAt()).isEqualTo(v.deadlineAt());
  assertThatThrownBy(()->flow.choose("role-b",selected.selectionId(),"blocked")).hasMessage("ASSESSMENT_IN_PROGRESS");
  assertThat(count("baseline_adaptive_attempt")).isOne();
  assertThatThrownBy(()->answers.answer(new AdaptiveAttemptUseCase.Answer(v.id(),v.revision(),99,id(100),"a","wrong-position"))).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
 }
 @Test void rb15EarlyManualInvalidationAndLinkedReplacementRetainOldVersion(){
  var v=start();var terminal=submits.submit(new AdaptiveAttemptUseCase.Submit(v.id(),v.revision(),"early"));
  assertThat(terminal.state()).isEqualTo("INVALIDATED");
  assertThat(results.result(v.id()).completionReason()).isEqualTo("MANUAL");
  assertThat(count("baseline_attempt_skill_result")).isZero();assertThat(count("employee_occupation_profile")).isZero();
  assertThat(submits.submit(new AdaptiveAttemptUseCase.Submit(v.id(),v.revision(),"early"))).isEqualTo(terminal);
  var replacement=starts.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"replacement");
  assertThat(results.result(v.id()).replacementAttemptId()).isEqualTo(replacement.id());
  assertThat(attempts.findOwned(ORG,EMP,replacement.id()).orElseThrow().snapshot().blueprint().id()).isEqualTo(version.id());
 }
 @Test void rb07And14Mm01And03SufficientWrongAnswersInitializeOriginalProfileNoScoreThreshold(){
  var terminal=finish();assertThat(terminal.state()).isEqualTo("AUTO_SUBMITTED");
  assertThat(count("employee_occupation_profile")).isOne();assertThat(count("baseline_mastery_evidence")).isEqualTo(3);
  var result=results.result(terminal.id());assertThat(result.rawScore()).isZero();assertThat(result.skills()).hasSize(3);
  var actor=new RoleBaselineFlow.Actor(ORG,EMP);var profile=profiles.mastery(actor).getFirst();
  assertThat(profile.attemptId()).isEqualTo(terminal.id());assertThat(profile.baselineVersion()).isEqualTo(1);
  var progress=profiles.progress(actor,role("role-b",OCC),Set.of("s1","s2","s3","new-current-skill"));
  assertThat(progress.state()).isEqualTo("COMPLETE");assertThat(progress.requiredCount()).isEqualTo(3);
  assertThat(profiles.mastery(new RoleBaselineFlow.Actor(ORG,OTHER))).isEmpty();
  assertThat(profiles.mastery(new RoleBaselineFlow.Actor(id(2),EMP))).isEmpty();
  var before=digest();assertThat(results.history()).hasSize(1);profiles.mastery(actor);results.result(terminal.id());
  assertThat(digest()).isEqualTo(before);
  assertThatThrownBy(()->starts.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"retake")).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
 }
 @Test void mm02ForeignResultsAndNoStateChangeReads(){
  var v=start();var before=digest();assertThat(results.history()).isEmpty();
  assertThatThrownBy(()->results.result(v.id())).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
  assertThat(profiles.mastery(new RoleBaselineFlow.Actor(ORG,EMP))).isEmpty();
  assertThat(digest()).isEqualTo(before);
  submits.submit(new AdaptiveAttemptUseCase.Submit(v.id(),v.revision(),"early"));
  when(context.requireEmployee()).thenReturn(new AdaptiveAttemptContextPort.Employee(ORG,OTHER));
  before=digest();assertThat(results.history()).isEmpty();
  assertThatThrownBy(()->results.result(v.id())).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
  assertThat(digest()).isEqualTo(before);
 }
 @Test void rb15AtomicProfileFailureRollsBackTerminalResponseEvidenceAndReceipt(){
  var v=start();for(int i=0;i<8;i++)v=answer(v,"answer-"+i);
  sql.execute("CREATE FUNCTION platform.test_profile_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected profile outage'; END $$");
  sql.execute("CREATE TRIGGER test_profile_failure BEFORE INSERT ON platform.employee_occupation_profile FOR EACH ROW EXECUTE FUNCTION platform.test_profile_failure()");
  var last=v;var before=digest();
  assertThatThrownBy(()->answer(last,"last")).isInstanceOf(RuntimeException.class);
  assertThat(digest()).isEqualTo(before);
  assertThat(attempts.findOwned(ORG,EMP,v.id()).orElseThrow().status()).isEqualTo(AdaptiveAttempt.Status.IN_PROGRESS);
  assertThat(count("baseline_attempt_result")).isZero();assertThat(count("baseline_mastery_evidence")).isZero();
  sql.execute("DROP TRIGGER test_profile_failure ON platform.employee_occupation_profile");
  var terminal=answer(last,"last");assertThat(terminal.state()).isEqualTo("AUTO_SUBMITTED");
  assertThat(count("employee_occupation_profile")).isOne();
 }
 @Test void rb10MissingActiveAndInfeasibleAreDistinctAndNoWrite(){
  var actor=new RoleBaselineFlow.Actor(ORG,EMP);
  authoring.disable(new Disable(OCC,1,"disable","test",version.id(),true));
  var before=digest();
  assertThat(profiles.progress(actor,role("role-a",OCC),Set.of("s1","s2","s3")).state()).isEqualTo("NO_BASELINE");
  assertThat(digest()).isEqualTo(before);
 }

 @Test void rb12ConcurrentAnswersAndHistoricalReplayHaveOneWinner() throws Exception {
  var v=start();var item=v.items().getFirst();var gate=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   var command=new AdaptiveAttemptUseCase.Answer(v.id(),v.revision(),1,item.itemVersionId(),"a","race-a");
   var other=new AdaptiveAttemptUseCase.Answer(v.id(),v.revision(),1,item.itemVersionId(),"b","race-b");
   Callable<String> a=()->{gate.await();try{answers.answer(command);return "ok-a";}catch(AdaptiveAttemptUseCase.Failure e){return e.code().name();}};
   Callable<String> b=()->{gate.await();try{answers.answer(other);return "ok-b";}catch(AdaptiveAttemptUseCase.Failure e){return e.code().name();}};
   var left=executor.submit(a);var right=executor.submit(b);gate.countDown();
   var outcomes=List.of(left.get(20,TimeUnit.SECONDS),right.get(20,TimeUnit.SECONDS));
   assertThat(outcomes).contains("VERSION_CONFLICT");assertThat(outcomes.stream().filter(x->x.startsWith("ok")).count()).isOne();
   var won=outcomes.contains("ok-a")?command:other;
   var firstReplay=answers.answer(won);answer(firstReplay,"later");
   assertThat(answers.answer(won)).isEqualTo(firstReplay);
   assertThatThrownBy(()->answers.answer(new AdaptiveAttemptUseCase.Answer(v.id(),v.revision(),1,item.itemVersionId(),won.selectedOptionId().equals("a")?"b":"a",won.idempotencyKey()))).isInstanceOf(AdaptiveAttemptStore.Failure.class);
   assertThat(count("baseline_attempt_response")).isEqualTo(2);
  }
 }
 @Test void abA05ExpiredAnswerAndWorkerSubmitRaceProduceOneInvalidation() throws Exception {
  var time=Instant.now().minusSeconds(600).truncatedTo(java.time.temporal.ChronoUnit.MICROS);
  var scope=new AdaptiveAttempt.Scope(ORG,EMP,OCC);
  var old=AdaptiveAttempt.start(id(600),scope,snapshot(version),time,false,Optional.empty());
  attempts.inTransaction(scope,()->{
   attempts.insert(scope,old,List.of("s1","s2","s3").stream().map(skill->new AdaptiveAttemptStore.SkillState(skill,java.math.BigDecimal.ZERO,java.math.BigDecimal.ONE,java.math.BigDecimal.ZERO,0,1,time)).toList(),
     new AdaptiveAttemptStore.PresentedItem(1,id(100),"s1",List.of("a","b"),Map.of("reason","COVERAGE"),time));return null;});
  var before=digest();
  assertThatThrownBy(()->answers.answer(new AdaptiveAttemptUseCase.Answer(old.id(),1,1,id(100),"a","late"))).isInstanceOfSatisfying(AdaptiveAttemptUseCase.Failure.class,e->assertThat(e.code()).isEqualTo(AdaptiveAttemptUseCase.Code.DEADLINE_REACHED));
  assertThat(digest()).isEqualTo(before);
  var policy=new PinnedAdaptiveAttemptPolicyAdapter(new JdbcAdaptiveTechnicalVersionStore(jdbc));
  var out=new JdbcAdaptiveAttemptOutcome(jdbc,JSON,attempts);
  var finalizer=new AdaptiveAttemptFinalizationService(attempts,policy,c->{out.persist(c);profiles.initialize(c);});
  var worker=new AdaptiveAttemptDeadlineWorker(attempts,finalizer,ORG,10);
  var gate=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   var a=executor.submit(()->{gate.await();return worker.runOnce();});
   var b=executor.submit(()->{gate.await();try{submits.submit(new AdaptiveAttemptUseCase.Submit(old.id(),1,"deadline"));return "ok";}catch(AdaptiveAttemptUseCase.Failure e){return e.code().name();}});
   gate.countDown();a.get(20,TimeUnit.SECONDS);assertThat(b.get(20,TimeUnit.SECONDS)).isIn("ok","ATTEMPT_CLOSED");
  }
  assertThat(results.result(old.id()).completionReason()).isEqualTo("DEADLINE");
  assertThat(sql.queryForObject("SELECT count(*) FROM platform.audit_event WHERE action='ADAPTIVE_BASELINE_INVALIDATED'",Long.class)).isOne();
  assertThat(count("baseline_mastery_evidence")).isZero();assertThat(count("employee_occupation_profile")).isZero();
 }
 @Test void rb15ValidHistoricalOutcomeWithoutProfileRemainsPendingAndDoesNotUnlockRetake(){
  var policy=new PinnedAdaptiveAttemptPolicyAdapter(new JdbcAdaptiveTechnicalVersionStore(jdbc));
  var out=new JdbcAdaptiveAttemptOutcome(jdbc,JSON,attempts);
  var finalizer=new AdaptiveAttemptFinalizationService(attempts,policy,out);
  answers=new AdaptiveAttemptAnswerService(context,attempts,policy,new JdbcAdaptiveAttemptContent(jdbc,id(50)),new JdbcAdaptiveAttemptScoring(jdbc,id(50)),Optional.of(finalizer));
  var terminal=finish();assertThat(results.result(terminal.id()).skills()).hasSize(3);
  var before=digest();
  assertThat(profiles.progress(new RoleBaselineFlow.Actor(ORG,EMP),role("role-a",OCC),Set.of("s1","s2","s3")).state()).isEqualTo("PROFILE_PENDING");
  assertThat(profiles.mastery(new RoleBaselineFlow.Actor(ORG,EMP))).isEmpty();
  assertThatThrownBy(()->starts.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"missing-profile-retake")).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
  assertThat(digest()).isEqualTo(before);
 }

 AdaptiveAttemptContextPort trustedContext(UUID employee) {
  var technical=new JdbcAdaptiveTechnicalVersionStore(jdbc);
  var resolver=new AdaptiveAttemptSnapshotResolver(blueprints,eligibility,technical);
  AdaptiveSelectedRolePort selected=(org,learner)->{
   var current=selections.current(new RoleBaselineFlow.Actor(org,learner)).orElseThrow();
   return new AdaptiveSelectedRolePort.Selected(current.role().id(),current.role().occupationId(),current.revision());};
  return new LocalAdaptiveAttemptContext(()->employee,jdbc,ORG,Set.of(OCC),scope->Optional.of(new AdaptiveBaselineCatalogPort.CatalogSnapshot(scope,"Fixture Occupation","fixture-f3-v1",roles())),resolver,selected,attempts,profiles::exists);
 }
 @Test void rb12StaleSelectionBetweenPrecheckAndStartCannotStartWrongOccupation(){
  var flow=selectionFlow(ORG,EMP);var first=flow.choose("role-a",null,"initial");
  var real=trustedContext(EMP);var stale=org.mockito.Mockito.spy(real);
  org.mockito.Mockito.doAnswer(i->{var scope=real.resolveScope(i.getArgument(0),i.getArgument(1));flow.choose("other",first.selectionId(),"changed-before-start");return scope;})
    .when(stale).resolveScope(any(),any());
  var usecase=new AdaptiveAttemptStartService(stale,attempts,new PinnedAdaptiveAttemptPolicyAdapter(new JdbcAdaptiveTechnicalVersionStore(jdbc)),new JdbcAdaptiveAttemptContent(jdbc,id(50)));
  assertThatThrownBy(()->usecase.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"stale-start")).isInstanceOfSatisfying(AdaptiveAttemptUseCase.Failure.class,e->assertThat(e.code()).isEqualTo(AdaptiveAttemptUseCase.Code.SELECTION_UNAVAILABLE));
  assertThat(count("baseline_adaptive_attempt")).isZero();assertThat(count("baseline_attempt_command")).isZero();
  assertThat(selections.current(new RoleBaselineFlow.Actor(ORG,EMP)).orElseThrow().role().occupationId()).isEqualTo("other-occ");
 }
 @Test void abA08DeactivateStartRacePreservesExistingPinsAndDeniesLaterNewStart() throws Exception {
  selectionFlow(ORG,EMP).choose("role-a",null,"role");
  selectionFlow(ORG,OTHER).choose("role-a",null,"other-role");
  var policy=new PinnedAdaptiveAttemptPolicyAdapter(new JdbcAdaptiveTechnicalVersionStore(jdbc));
  var content=new JdbcAdaptiveAttemptContent(jdbc,id(50));
  var start=new AdaptiveAttemptStartService(trustedContext(EMP),attempts,policy,content);
  var gate=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   var a=executor.submit(()->{gate.await();try{return start.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"racing-start").id();}catch(AdaptiveAttemptUseCase.Failure e){assertThat(e.code()).isEqualTo(AdaptiveAttemptUseCase.Code.BLUEPRINT_UNAVAILABLE);return (UUID)null;}});
   var b=executor.submit(()->{gate.await();return authoring.disable(new Disable(OCC,1,"racing-disable","test",version.id(),true));});
   gate.countDown();var started=a.get(20,TimeUnit.SECONDS);b.get(20,TimeUnit.SECONDS);
   if(started!=null){var pinned=attempts.findOwned(ORG,EMP,started).orElseThrow();assertThat(start.resume(started).deadlineAt()).isEqualTo(pinned.deadlineAt());assertThat(pinned.snapshot().blueprint().id()).isEqualTo(version.id());}
  }
  var after=new AdaptiveAttemptStartService(trustedContext(OTHER),attempts,policy,content);var before=digest();
  assertThatThrownBy(()->after.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"after-disable")).isInstanceOfSatisfying(AdaptiveAttemptUseCase.Failure.class,e->assertThat(e.code()).isEqualTo(AdaptiveAttemptUseCase.Code.BLUEPRINT_UNAVAILABLE));
  assertThat(digest()).isEqualTo(before);
 }
 @Test void rb16RealIdentityReloadsActiveRoleAndTenantOnEveryCall(){
  var identity=trustedContext(EMP);
  assertThat(identity.requireEmployee().learnerId()).isEqualTo(EMP);
  assertThatThrownBy(()->identity.authorizeScope(identity.requireEmployee(),new AdaptiveAttempt.Scope(id(2),EMP,OCC))).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
  assertThatThrownBy(()->identity.authorizeScope(identity.requireEmployee(),new AdaptiveAttempt.Scope(ORG,OTHER,OCC))).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
  sql.update("DELETE FROM platform.account_role WHERE account_id=? AND role_code='EMPLOYEE'",EMP);
  assertThatThrownBy(identity::requireEmployee).isInstanceOfSatisfying(AdaptiveAttemptUseCase.Failure.class,e->assertThat(e.code()).isEqualTo(AdaptiveAttemptUseCase.Code.FORBIDDEN));
  sql.update("INSERT INTO platform.account_role VALUES (?,'EMPLOYEE')",EMP);
  sql.update("UPDATE platform.account SET active=false WHERE account_id=?",EMP);
  assertThatThrownBy(identity::requireEmployee).isInstanceOf(AdaptiveAttemptUseCase.Failure.class);
 }

 @Test void mm01MultipleOccupationProfilesKeepIndependentSourceVersions(){
  var first=finish();var original=profiles.mastery(new RoleBaselineFlow.Actor(ORG,EMP)).getFirst();
  var otherScope=new Scope(ORG,"other-occupation");
  version=blueprints.inTransaction(otherScope,()->{
   var identity=blueprints.ensureIdentity(otherScope,MANAGER);
   var next=new Version(otherScope,new VersionId(identity,1),config(),"Other Occupation","fixture-f3-other",PINS,roles(),MANAGER,NOW);
   blueprints.insertVersion(otherScope,next);
   var active=new Activation(otherScope,1,Optional.of(next.id()),MANAGER,NOW);
   blueprints.saveActivation(otherScope,0,active);blueprints.appendActivationEvent(otherScope,active,AdaptiveBlueprintStore.Operation.FINALIZE,"");return next;});
  when(context.resolveScope(any(),any())).thenReturn(new AdaptiveAttempt.Scope(ORG,EMP,"other-occupation"));
  var second=starts.startOrResume(new AdaptiveAttemptUseCase.SelectedRole(),"second-occupation");
  while(second.state().equals("IN_PROGRESS"))second=answer(second,"other-answer-"+second.revision());
  var own=profiles.mastery(new RoleBaselineFlow.Actor(ORG,EMP));
  assertThat(own).hasSize(2);assertThat(own).contains(original);
  assertThat(own).extracting(RoleBaselineFlow.MasteryProfile::occupationId).containsExactlyInAnyOrder(OCC,"other-occupation");
  assertThat(own).extracting(RoleBaselineFlow.MasteryProfile::attemptId).containsExactlyInAnyOrder(first.id(),second.id());
  assertThat(profiles.mastery(new RoleBaselineFlow.Actor(id(2),EMP))).isEmpty();
 }
 @Test void abC15ListBoundsLiteralWildcardTenantAndNoWriteDuringCatalogOutage(){
  var draft=authoring.save(new Save(OCC,0,"search-draft",Configuration.occupation("Tên %_ fixture",new Bounds(9,540))));
  when(eligibility.resolve(SCOPE)).thenThrow(new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("outage",null));
  var before=digest();
  var literal=authoring.list(new AdaptiveBlueprintListing.Query("%_",null,AdaptiveBlueprintListing.Direction.NEWEST,0,1,OCC));
  assertThat(literal.total()).isEqualTo(1);assertThat(literal.rows()).singleElement().satisfies(r->assertThat(r.workingRevisionId()).isEqualTo(draft.workingRevisionId()));
  var second=authoring.list(new AdaptiveBlueprintListing.Query("",null,AdaptiveBlueprintListing.Direction.NEWEST,1,1,OCC));
  assertThat(second.total()).isEqualTo(2);assertThat(second.rows()).hasSize(1);
  assertThat(blueprints.list(id(2),Set.of(OCC),new AdaptiveBlueprintListing.Query("",null,AdaptiveBlueprintListing.Direction.NEWEST,0,20,OCC)).total()).isZero();
  assertThat(blueprints.list(ORG,Set.of(),new AdaptiveBlueprintListing.Query("",null,AdaptiveBlueprintListing.Direction.NEWEST,0,20,null)).rows()).isEmpty();
  assertThatThrownBy(()->new AdaptiveBlueprintListing.Query("",null,AdaptiveBlueprintListing.Direction.NEWEST,0,101,OCC)).isInstanceOf(IllegalArgumentException.class);
  assertThat(digest()).isEqualTo(before);
 }
 @Test void rb10InfeasibleActiveIsDistinctFromMissingActive(){
  var eligible=eligible();var broken=new HashMap<>(eligible.roles());
  broken.put("role-b",new AdaptiveBlueprintEligibilityPort.RolePool(roles().get("role-b"),pool().entrySet().stream().filter(e->e.getValue().equals("s2")).map(Map.Entry::getKey).collect(java.util.stream.Collectors.toSet()),Set.of()));
  var published=pool().entrySet().stream().filter(e->!e.getValue().equals("s3")).collect(java.util.stream.Collectors.toMap(Map.Entry::getKey,Map.Entry::getValue));
  var coverage=new AdaptiveBlueprintEligibilityPort.Coverage(3,4096,published);
  var snapshot=new AdaptiveBlueprintEligibilityPort.Snapshot(SCOPE,eligible.occupationName(),eligible.catalogFingerprint(),PINS,broken,coverage);
  when(eligibility.resolvePinned(SCOPE,PINS)).thenReturn(Optional.of(snapshot));
  var before=digest();
  assertThat(profiles.progress(new RoleBaselineFlow.Actor(ORG,EMP),role("role-a",OCC),Set.of("s1","s2","s3")).state()).isEqualTo("BASELINE_UNAVAILABLE");
  assertThat(digest()).isEqualTo(before);
 }
 @Test void vb04ReceiptFailureRollsBackVersionDraftPointerAndTransition(){
  var draft=authoring.save(new Save(OCC,0,"rollback-draft",config()));
  sql.execute("CREATE FUNCTION platform.test_receipt_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected receipt outage'; END $$");
  sql.execute("CREATE TRIGGER test_receipt_failure BEFORE INSERT ON platform.baseline_blueprint_command FOR EACH ROW EXECUTE FUNCTION platform.test_receipt_failure()");
  var before=digest();var command=new Finalize(OCC,draft.workingRevisionId(),draft.revision(),1,"rollback-activate",version.id(),true);
  assertThatThrownBy(()->authoring.finalizeBlueprint(command)).isInstanceOf(RuntimeException.class);
  assertThat(digest()).isEqualTo(before);assertThat(blueprints.findWorking(SCOPE)).contains(draft);
  assertThat(count("baseline_adaptive_blueprint_version")).isOne();
  sql.execute("DROP TRIGGER test_receipt_failure ON platform.baseline_blueprint_command");
  assertThat(authoring.finalizeBlueprint(command).id().version()).isEqualTo(2);
 }

 @Test void abA09AndR02LegacyRoleResultReaderRetainsOriginalSubsetWithoutCatalog(){
  var scope=new Scope(ORG,"legacy-occupation");
  var legacy=blueprints.inTransaction(scope,()->{
   var identity=blueprints.ensureIdentity(scope,MANAGER);
   var configuration=new Configuration("Historical role baseline",new Bounds(9,540),Map.of("role-a",new Bounds(6,360),"role-b",new Bounds(6,360)));
   var old=new Version(scope,new VersionId(identity,1),configuration,"Historical Occupation","legacy-fixture-v1",PINS,roles(),MANAGER,NOW);
   blueprints.insertVersion(scope,old);
   var activation=new Activation(scope,1,Optional.of(old.id()),MANAGER,NOW);
   blueprints.saveActivation(scope,0,activation);blueprints.appendActivationEvent(scope,activation,AdaptiveBlueprintStore.Operation.FINALIZE,"");
   return old;});
  var originalPool=pool().entrySet().stream().filter(e->!e.getValue().equals("s3")).collect(java.util.stream.Collectors.toMap(Map.Entry::getKey,Map.Entry::getValue));
  var snapshot=new AdaptiveAttemptSnapshot(legacy,AdaptiveAttemptSnapshot.Purpose.ROLE_REQUIREMENT,Optional.of("role-a"),Optional.of(1L),originalPool);
  var now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
  var old=AdaptiveAttempt.start(id(700),new AdaptiveAttempt.Scope(ORG,EMP,scope.occupationId()),snapshot,now,false,Optional.empty());
  attempts.inTransaction(old.scope(),()->{attempts.insert(old.scope(),old,List.of("s1","s2").stream().map(skill->new AdaptiveAttemptStore.SkillState(skill,java.math.BigDecimal.ZERO,java.math.BigDecimal.ONE,java.math.BigDecimal.ZERO,0,1,now)).toList(),new AdaptiveAttemptStore.PresentedItem(1,id(100),"s1",List.of("a","b"),Map.of("reason","COVERAGE"),now));return null;});
  var view=starts.resume(old.id());while(view.state().equals("IN_PROGRESS"))view=answer(view,"legacy-answer-"+view.revision());
  when(eligibility.resolve(any())).thenThrow(new AdaptiveBlueprintEligibilityPort.DependencyUnavailable("current catalog outage",null));
  var before=digest();var result=results.result(old.id());
  assertThat(result.assessmentScope()).isEqualTo(AdaptiveAttemptUseCase.AssessmentScope.EARLIER_ROLE);
  assertThat(result.skills()).extracting(AdaptiveAttemptUseCase.SkillResult::microSkillId).containsExactly("s1","s2");
  assertThat(result.roleName()).isEqualTo("Role A");assertThat(result.occupationName()).isEqualTo("Historical Occupation");
  assertThat(results.history()).hasSize(1);assertThat(digest()).isEqualTo(before);
 }

 @org.junit.jupiter.params.ParameterizedTest
 @org.junit.jupiter.params.provider.ValueSource(strings={"{\"s1\":0,\"s2\":0}","{\"s1\":0,\"s2\":null,\"s3\":\"UNKNOWN\"}"})
 void rb06PartialAndInvalidProfileValuesNeverClaimCompleteCoverage(String mastery){
  var policy=new PinnedAdaptiveAttemptPolicyAdapter(new JdbcAdaptiveTechnicalVersionStore(jdbc));
  var out=new JdbcAdaptiveAttemptOutcome(jdbc,JSON,attempts);
  var finalizer=new AdaptiveAttemptFinalizationService(attempts,policy,out);
  answers=new AdaptiveAttemptAnswerService(context,attempts,policy,new JdbcAdaptiveAttemptContent(jdbc,id(50)),new JdbcAdaptiveAttemptScoring(jdbc,id(50)),Optional.of(finalizer));
  var terminal=finish();
  // Explicit incomplete owner-profile fixture, not a runtime importer or a retake/remediation policy.
  sql.update("INSERT INTO platform.employee_occupation_profile(organization_id,learner_id,occupation_id,attempt_id,blueprint_id,blueprint_version,catalog_fingerprint,required_skills,mastery,initialized_at) SELECT organization_id,learner_id,occupation_id,attempt_id,blueprint_id,blueprint_version,catalog_fingerprint,'[\"s1\",\"s2\",\"s3\"]'::jsonb,CAST(? AS jsonb),finished_at FROM platform.baseline_adaptive_attempt WHERE attempt_id=?",mastery,terminal.id());
  var actor=new RoleBaselineFlow.Actor(ORG,EMP);var before=digest();
  var progress=profiles.progress(actor,role("role-a",OCC),Set.of("s1","s2","s3"));
  assertThat(progress.state()).isEqualTo("PROFILE_INCOMPLETE");assertThat(progress.requiredCount()).isEqualTo(3);
  assertThat(progress.coveredCount()).isEqualTo(mastery.contains("UNKNOWN")?1:2);
  assertThatThrownBy(()->profiles.mastery(actor)).isInstanceOf(IllegalStateException.class);
  assertThat(digest()).isEqualTo(before);
 }
}
