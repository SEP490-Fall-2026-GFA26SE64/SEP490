package com.adaptlearngraph.services;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.adaptlearngraph.entities.domain.RequirementPathway.*;
import com.adaptlearngraph.entities.domain.LearningResources.Asset;
import com.adaptlearngraph.repository.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import java.util.*;
import org.junit.jupiter.api.*;

/** Real certificate submission/decision/evidence persistence. Private asset metadata uses a controlled port. */
class WF05CertificatePersistenceTest {
    WF05PathwayPersistenceTest p;CertificateSubmissionService submissions;CertificateReviewService reviews;UUID step;
    LearningContentPort content;
    @BeforeAll static void start(){WF05PolicyPersistenceTest.start();}
    @AfterAll static void stop(){WF05PolicyPersistenceTest.stop();}
    @BeforeEach void setup() throws Exception {p=new WF05PathwayPersistenceTest();p.setup();var f=p.a.f;var db=WF05PolicyPersistenceTest.db;
        p.need=new Requirement("S-A","Skill A",com.adaptlearngraph.entities.domain.KnowledgeLevel.FOUNDATION,"v1",List.of("OUT-1"),Provision.CERTIFICATE_ONLY);
        var cert=new RulePathwayCatalog.Certificate("CERT-A","cert-v1","Certificate A","https://example.test/certificate",List.of("OUT-1"));
        p.snapshot=new RulePathwayCatalog.Snapshot("cert-catalog-v1",List.of(p.need),Map.of(),Map.of(p.need.key(),cert));p.generated();p.expert();
        p.review.approve(p.request,UUID.randomUUID().toString(),p.expected());step=p.revisions.read(p.row()).steps().getFirst().id();
        content=mock(LearningContentPort.class);var files=mock(LearningAssetPort.class);
        var access=new RequirementPathwayAccess(()->p.actor,p.a.selections,p.rules,p.revisions,p.admission,p.assignments,p.data,p.catalog,mock(ModuleAuthoringPort.class),f.json);
        var receipts=new JpaInitialReceipts(db.bean(InitialPathwayReceiptJpaRepository.class));
        submissions=new CertificateSubmissionService(()->p.actor,p.a.selections,p.rules,p.revisions,p.admission,access,p.catalog,db.bean(CertificateSubmissionJpaRepository.class),content,files,receipts,f.json);
        var planning=new RequirementPathwayPlanningService(p.catalog,p.rules,p.admission,p.revisions,f.json).history(db.bean(RuleAssessmentContextJpaRepository.class));
        reviews=new CertificateReviewService(()->p.actor,p.assignments,p.a.selections,db.bean(CertificateSubmissionJpaRepository.class),submissions,p.rules,p.revisions,content,files,receipts,
            db.bean(OutboxEventJpaRepository.class),db.bean(RuleAssessmentAttemptJpaRepository.class),db.bean(RuleAssessmentOutcomeJpaRepository.class),db.bean(AuditEventJpaRepository.class)).recalculateWith(planning,p.review);
        employee();}
    void employee(){p.actor=new Actor(p.a.f.org,p.a.f.actor,Role.EMPLOYEE);}
    CertificateSubmissionService.Expected expected(){var r=p.row();return new CertificateSubmissionService.Expected(r.getCurrentRevision(),r.getContentHash(),step);}
    CertificateSubmissionService.Submission submit(String link,UUID asset,UUID prior) throws Exception {
        var receipt=submissions.submit(p.request,UUID.randomUUID().toString(),new CertificateSubmissionService.Submit(expected(),link,asset,prior));
        return p.a.f.json.readValue(receipt.responseJson(),CertificateSubmissionService.Submission.class);}
    int evidence(){return WF05PolicyPersistenceTest.sql.queryForObject("SELECT count(*) FROM platform.skill_knowledge_evidence WHERE organization_id=? AND learner_id=?",Integer.class,p.a.f.org,p.a.f.actor);}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-F15 - Validate evidence and persist pending certificate submission")
    void validAndInvalidLinks() throws Exception {
        assertThatThrownBy(()->submit("http://example.test/evidence",null,null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->submit("https://example.test/evidence",UUID.randomUUID(),null)).hasMessageContaining("EXACTLY_ONE_CERTIFICATE_EVIDENCE_REQUIRED");
        UUID foreign=UUID.randomUUID();when(content.asset(p.a.f.org.toString(),foreign.toString())).thenReturn(Optional.of(new Asset(foreign.toString(),p.a.f.org.toString(),p.a.f.otherActor.toString(),
            p.a.f.org+"/certificate-evidence/foreign","foreign.pdf","application/pdf",100,"a".repeat(64),null,"2026-11-16T00:00:00Z")));
        assertThatThrownBy(()->submit(null,foreign,null)).hasMessageContaining("PRIVATE_FILE_NOT_FOUND");
        var s=submit("https://example.test/evidence",null,null);assertThat(s.status()).isEqualTo("PENDING");assertThat(s.stepId()).isEqualTo(step);assertThat(s.requestId()).isEqualTo(p.request);assertThat(s.requirement()).isEqualTo(p.need);assertThat(evidence()).isZero();
        assertThat(submissions.history(p.request,step,0,20).getFirst().id()).isEqualTo(s.id());}
    @Test @DisplayName("WF05 regression: persistence: owned private file creates pending pinned attachment and no achievement")
    void ownedFile() throws Exception {
        UUID id=UUID.randomUUID();var file=new Asset(id.toString(),p.a.f.org.toString(),p.a.f.actor.toString(),p.a.f.org+"/certificate-evidence/owned","proof.pdf","application/pdf",128,"a".repeat(64),null,"2026-11-16T00:00:00Z");
        when(content.asset(p.a.f.org.toString(),id.toString())).thenReturn(Optional.of(file));
        var s=submit(null,id,null);assertThat(s.status()).isEqualTo("PENDING");assertThat(s.filename()).isEqualTo("proof.pdf");assertThat(s.mediaType()).isEqualTo("application/pdf");assertThat(evidence()).isZero();
        assertThatThrownBy(()->submit(null,id,null)).hasMessageContaining("CERTIFICATE_REVIEW_PENDING");
    }
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-S06 - Reject with reason and replace latest rejected submission")
    void rejectAndReplace() throws Exception {var first=submit("https://example.test/evidence",null,null);p.expert();
        assertThatThrownBy(()->reviews.decide(first.id(),UUID.randomUUID().toString(),new CertificateReviewService.Decide(first.revision(),"REJECTED",""))).hasMessageContaining("DECISION_AND_REASON_REQUIRED");
        reviews.decide(first.id(),UUID.randomUUID().toString(),new CertificateReviewService.Decide(first.revision(),"REJECTED","Evidence unreadable"));employee();
        var replacement=submit("https://example.test/corrected",null,first.id());assertThat(replacement.status()).isEqualTo("PENDING");assertThat(replacement.replacesSubmissionId()).isEqualTo(first.id());assertThat(evidence()).isZero();
        var history=submissions.history(p.request,step,0,20);assertThat(history).hasSize(2);assertThat(history.get(1).status()).isEqualTo("REJECTED");assertThat(history.get(1).decision().reason()).isEqualTo("Evidence unreadable");
        p.expert();reviews.decide(replacement.id(),UUID.randomUUID().toString(),new CertificateReviewService.Decide(replacement.revision(),"REJECTED","Still unreadable"));employee();
        assertThatThrownBy(()->submit("https://example.test/old-replacement",null,first.id())).hasMessageContaining("STALE_SUBMISSION");}
    @Test @org.junit.jupiter.api.Tag("bm04-wf05") @DisplayName("TC-WF05-S07 - Assigned approval creates evidence once")
    void approveOnce() throws Exception {var s=submit("https://example.test/evidence",null,null);p.expert();String key=UUID.randomUUID().toString();var command=new CertificateReviewService.Decide(s.revision(),"APPROVED","");
        var accepted=reviews.decide(s.id(),key,command);var replay=reviews.decide(s.id(),key,command);
        assertThat(p.a.f.json.readTree(replay.responseJson())).isEqualTo(p.a.f.json.readTree(accepted.responseJson()));assertThat(evidence()).isEqualTo(1);
        assertThatThrownBy(()->reviews.decide(s.id(),UUID.randomUUID().toString(),new CertificateReviewService.Decide(s.revision(),"REJECTED","Stale"))).hasMessageContaining("STALE_SUBMISSION");
        employee();assertThatThrownBy(()->submit("https://example.test/duplicate",null,null)).hasMessageContaining("REQUIREMENT_ALREADY_ACHIEVED");
        var db=WF05PolicyPersistenceTest.db;var clock=db.bean(RuleAssessmentAttemptJpaRepository.class);
        var planning=new RequirementPathwayPlanningService(p.catalog,p.rules,p.admission,p.revisions,p.a.f.json).history(db.bean(RuleAssessmentContextJpaRepository.class));
        var refresh=new RequirementPathwayRefreshService(db.bean(RequirementPathwayRefreshJpaRepository.class),p.rules,p.revisions,planning,p.review,p.a.selections,
            db.bean(OutboxEventJpaRepository.class),clock,new org.springframework.transaction.support.TransactionTemplate(db.transactionManager()));
        for(int i=0;i<30 && p.revisions.read(p.row()).steps().getFirst().state()!=State.FULFILLED;i++)refresh.runBatch();
        assertThat(p.revisions.read(p.row()).steps().getFirst().state()).isEqualTo(State.FULFILLED);
        assertThat(p.a.selections.targetLocked(p.a.current)).isFalse();assertThat(evidence()).isEqualTo(1);
    }
}
