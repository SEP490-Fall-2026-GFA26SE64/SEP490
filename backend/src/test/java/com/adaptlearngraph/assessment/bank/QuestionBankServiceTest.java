package com.adaptlearngraph.assessment.bank;

import com.adaptlearngraph.assessment.bank.application.QuestionBankService;
import com.adaptlearngraph.assessment.bank.application.port.in.QuestionBankUseCase.*;
import com.adaptlearngraph.assessment.bank.application.port.out.QuestionBankPorts.*;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class QuestionBankServiceTest {
    final UUID org=UUID.randomUUID(),expert=UUID.randomUUID(),peer=UUID.randomUUID(),ld=UUID.randomUUID();
    Actor actor;
    String skillName="Skill";
    QuestionBank bank;
    QuestionBankService service;
    ObjectMapper json=new ObjectMapper().findAndRegisterModules();
    final Content complete=new Content("A question",List.of("One","Two","Three","Four"),0,"skill","Skill","EASY","Because one is correct");
    @BeforeEach void setup(){
        actor=new Actor(expert,org,"DOMAIN_EXPERT");bank=new QuestionBank();bank.id=UUID.randomUUID();bank.organization=org;bank.name="Bank";
        Store store=new Store(){public <T>T atomic(Actor a,Function<QuestionBank,T> operation){try{var copy=json.readValue(json.writeValueAsBytes(bank),QuestionBank.class);T out=operation.apply(copy);bank=copy;return out;}catch(Failure e){throw e;}catch(Exception e){throw new RuntimeException(e);}}};
        Catalog catalog=new Catalog(){public List<Choice>skills(Actor a){return List.of(new Choice("skill","Skill"));}public String requireSkill(Actor a,String id){if(!id.equals("skill"))throw new Failure(400,"Invalid skill");return skillName;}public List<Choice>experts(Actor a){return List.of(new Choice(expert.toString(),"Expert"),new Choice(peer.toString(),"Peer"));}public List<Choice>managers(Actor a){return List.of(new Choice(ld.toString(),"Manager"));}public void requireExpert(Actor a,UUID id){if(!List.of(expert,peer).contains(id))throw new Failure(409,"Inactive Expert");}};
        service=new QuestionBankService(()->actor,catalog,store,Clock.fixed(Instant.parse("2026-10-30T00:00:00Z"),ZoneOffset.UTC));
    }
    Question create(){service.save(new Save(null,null,"Q-1",complete,false));return bank.questions.getFirst();}
    void expert(){actor=new Actor(expert,org,"DOMAIN_EXPERT");}
    void manager(){actor=new Actor(ld,org,"LD_MANAGER");}
    void action(String action){var q=bank.questions.getFirst();service.command(new Command(q.id,q.revision,action,"Reason",null));}
    void publish(){create();action("SUBMIT");manager();action("VIEW");action("APPROVE");}
    @Test void incompleteDraftIsRealAndCannotSubmit(){var c=new Content("Draft",List.of(),null,"skill",null,null,null);service.save(new Save(null,null," q-1 ",c,false));var q=bank.questions.getFirst();assertEquals("Q-1",q.code);assertNull(q.versions.getFirst().content.correctAnswer());assertThrows(Failure.class,()->action("SUBMIT"));assertEquals("DRAFT",bank.questions.getFirst().versions.getFirst().state);}
    @Test void peerCannotEditAndCodeCannotChange(){var q=create();actor=new Actor(peer,org,"DOMAIN_EXPERT");assertEquals(403,assertThrows(Failure.class,()->service.save(new Save(q.id,q.revision,q.code,complete,false))).status());expert();assertEquals(409,assertThrows(Failure.class,()->service.save(new Save(q.id,q.revision,"OTHER",complete,false))).status());}
    @Test void approvalRequiresViewedExactVersionAndPublishes(){create();action("SUBMIT");manager();assertThrows(Failure.class,()->action("APPROVE"));action("VIEW");action("APPROVE");assertEquals("PUBLISHED",bank.questions.getFirst().versions.getLast().state);assertEquals(ld,bank.questions.getFirst().versions.getLast().reviewedBy);assertTrue(bank.notices.stream().anyMatch(n->ld.equals(n.recipient)));}
    @Test void catalogRenameCannotSilentlyRewriteViewedVersion(){create();action("SUBMIT");manager();action("VIEW");skillName="Renamed";assertEquals(409,assertThrows(Failure.class,()->action("APPROVE")).status());assertEquals("SUBMITTED",bank.questions.getFirst().versions.getLast().state);assertEquals("Skill",bank.questions.getFirst().versions.getLast().content.skillName());}
    @Test void bulkApprovalIsAtomicForStaleSelection(){create();action("SUBMIT");manager();action("VIEW");var q=bank.questions.getFirst();assertThrows(Failure.class,()->service.approve(new Bulk(List.of(new Command(q.id,q.revision,"APPROVE",null,null),new Command(UUID.randomUUID(),1,"APPROVE",null,null)))));assertEquals("SUBMITTED",bank.questions.getFirst().versions.getLast().state);}
    @Test void publishedVersionSurvivesSuccessorAndReturn(){publish();expert();action("SUCCESSOR");assertEquals(2,bank.questions.getFirst().versions.size());action("SUBMIT");manager();action("RETURN");assertEquals("PUBLISHED",bank.questions.getFirst().versions.getFirst().state);assertEquals("DRAFT",bank.questions.getFirst().versions.getLast().state);assertTrue(bank.history.stream().anyMatch(a->a.action().equals("RETURN")));}
    @Test void transferRetainsSubmittedVersionAndRevokesOldOwner(){create();action("SUBMIT");manager();var q=bank.questions.getFirst();service.command(new Command(q.id,q.revision,"ASSIGN","Handover",peer));assertEquals("SUBMITTED",bank.questions.getFirst().versions.getLast().state);assertEquals(expert,bank.questions.getFirst().versions.getLast().submittedBy);expert();assertThrows(Failure.class,()->action("WITHDRAW"));}
    @Test void withdrawAndStaleApprovalCannotRace(){create();action("SUBMIT");manager();action("VIEW");var q=bank.questions.getFirst();long old=q.revision;expert();action("WITHDRAW");manager();assertThrows(Failure.class,()->service.command(new Command(q.id,old,"APPROVE",null,null)));assertEquals("DRAFT",bank.questions.getFirst().versions.getLast().state);}
    @Test void retirementAndReactivationRequireManager(){publish();expert();action("REQUEST_RETIRE");assertFalse(bank.questions.getFirst().retired);assertThrows(Failure.class,()->action("CONFIRM_AVAILABILITY"));manager();action("CONFIRM_AVAILABILITY");assertTrue(bank.questions.getFirst().retired);expert();action("REQUEST_REACTIVATE");manager();action("CONFIRM_AVAILABILITY");assertFalse(bank.questions.getFirst().retired);}
    @Test void incompleteImportUsesSameDraftRules(){var p=service.preview(new Preview(List.of(new Row("Q-DRAFT",new Content("Draft imported",List.of(),null,"skill",null,null,null)))));assertTrue(p.errors.isEmpty());service.confirm(new Confirmation(p.id,false,false));var v=bank.questions.getFirst().versions.getFirst();assertEquals("DRAFT",v.state);assertNull(v.content.correctAnswer());assertThrows(Failure.class,()->action("SUBMIT"));}
    @Test void invalidImportNeverWritesQuestions(){var p=service.preview(new Preview(List.of(new Row("Q-1",complete),new Row("Q-2",new Content("",List.of(),null,"skill",null,null,null)))));assertFalse(p.errors.isEmpty());assertThrows(Failure.class,()->service.confirm(new Confirmation(p.id,true,true)));assertTrue(bank.questions.isEmpty());}
    @Test void ownDuplicateCreatesDraftAndIsReplaySafe(){publish();expert();var p=service.preview(new Preview(List.of(new Row("Q-1",complete))));assertThrows(Failure.class,()->service.confirm(new Confirmation(p.id,true,false)));service.confirm(new Confirmation(p.id,true,true));service.confirm(new Confirmation(p.id,true,true));assertEquals(2,bank.questions.getFirst().versions.size());assertEquals("PUBLISHED",bank.questions.getFirst().versions.getFirst().state);assertEquals("DRAFT",bank.questions.getFirst().versions.getLast().state);}
    @Test void anotherOwnerOrExistingDraftBlocksWholeImport(){create();var p=service.preview(new Preview(List.of(new Row("Q-1",complete))));assertFalse(p.errors.isEmpty());actor=new Actor(peer,org,"DOMAIN_EXPERT");p=service.preview(new Preview(List.of(new Row("Q-1",complete))));assertTrue(p.errors.getFirst().contains("responsible"));}
    @Test void duplicateContentNeedsExplicitAcknowledgement(){create();assertThrows(Failure.class,()->service.save(new Save(null,null,"Q-2",complete,false)));service.save(new Save(null,null,"Q-2",complete,true));assertEquals(2,bank.questions.size());}
    @Test void legacyPublishedExplanationIsNotFabricatedOnReactivation(){publish();var v=bank.questions.getFirst().versions.getFirst();v.content=new Content(v.content.prompt(),v.content.options(),v.content.correctAnswer(),v.content.skillId(),v.content.skillName(),v.content.difficulty(),null);expert();action("REQUEST_RETIRE");manager();action("CONFIRM_AVAILABILITY");expert();action("REQUEST_REACTIVATE");manager();action("CONFIRM_AVAILABILITY");assertNull(bank.questions.getFirst().versions.getFirst().content.explanation());}
    @Test void learnerCannotReadKeys(){actor=new Actor(UUID.randomUUID(),org,"EMPLOYEE");assertEquals(403,assertThrows(Failure.class,service::read).status());}
}
